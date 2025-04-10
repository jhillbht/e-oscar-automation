const admin = require('firebase-admin');
const { eoscarService } = require('../services/eoscar');
const { clickupService } = require('../services/clickup');
const { logger } = require('../utils/logger');
const { updateStatus } = require('../utils/status');

/**
 * Handler for reviewDisputes function
 * @param {Object} data - Function data
 * @param {Object} context - Function context
 * @returns {Promise<Object>} - Results of the review operation
 */
exports.reviewDisputesHandler = async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new Error('Unauthorized');
  }
  
  const userId = context.auth.uid;
  const { clientName = 'all', startDate, endDate } = data;
  
  try {
    // Update status
    await updateStatus({
      userId,
      status: 'running',
      progress: 0,
      message: 'Starting dispute review process',
      log: 'Initializing dispute review process'
    });
    
    // Get disputes to review
    await updateStatus({
      userId,
      status: 'running',
      progress: 5,
      log: 'Fetching pending disputes'
    });
    
    // Query Firestore for pending disputes
    let disputesQuery = admin.firestore().collection('disputes')
      .where('dispute_status', '==', 'Pending');
    
    // Add client filter if specified
    if (clientName !== 'all') {
      disputesQuery = disputesQuery.where('client_name', '==', clientName);
    }
    
    // Add date range filter
    if (startDate && endDate) {
      disputesQuery = disputesQuery.where('date_received', '>=', startDate)
        .where('date_received', '<=', endDate);
    }
    
    // Order by due date
    disputesQuery = disputesQuery.orderBy('response_due_date');
    
    const disputesSnapshot = await disputesQuery.get();
    
    if (disputesSnapshot.empty) {
      await updateStatus({
        userId,
        status: 'complete',
        progress: 100,
        log: 'No pending disputes found to review'
      });
      
      return {
        success: true,
        disputes: [],
        total: 0
      };
    }
    
    // Process disputes
    const disputes = [];
    disputesSnapshot.forEach(doc => {
      disputes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Initialize browser
    await updateStatus({
      userId,
      status: 'running',
      progress: 10,
      log: 'Launching browser'
    });
    
    await eoscarService.initialize();
    
    // Login to E-Oscar
    // We assume all disputes are accessed with the same credentials
    // In a real implementation, you might need to handle different credentials for different clients
    const firstDispute = disputes[0];
    const credentialsSnapshot = await admin.firestore()
      .collection('credentials')
      .where('client_name', '==', firstDispute.client_name)
      .where('active', '==', true)
      .limit(1)
      .get();
    
    if (credentialsSnapshot.empty) {
      throw new Error(`No credentials found for client: ${firstDispute.client_name}`);
    }
    
    const credential = credentialsSnapshot.docs[0].data();
    
    await updateStatus({
      userId,
      status: 'running',
      progress: 15,
      log: `Logging in as ${credential.username}`
    });
    
    await eoscarService.login(credential.username, credential.password);
    
    // Process each dispute
    const reviewedDisputes = [];
    let currentProgress = 15;
    const progressPerDispute = 75 / disputes.length;
    
    for (let i = 0; i < disputes.length; i++) {
      const dispute = disputes[i];
      
      try {
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress,
          log: `Processing dispute ${i + 1}/${disputes.length}: ${dispute.control_number}`
        });
        
        // Search for the case
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress + (progressPerDispute * 0.2),
          log: `Searching for case: ${dispute.control_number}`
        });
        
        await eoscarService.searchCase(dispute.control_number);
        
        // Categorize the dispute
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress + (progressPerDispute * 0.5),
          log: `Categorizing dispute: ${dispute.control_number}`
        });
        
        const categorization = await eoscarService.categorizeDispute();
        
        // Take appropriate action based on categorization
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress + (progressPerDispute * 0.7),
          log: `Taking action for ${categorization.isFrivolous ? 'frivolous' : 'non-frivolous'} dispute: ${dispute.control_number}`
        });
        
        let actionResult;
        
        if (categorization.isFrivolous) {
          // Handle frivolous case
          actionResult = await eoscarService.handleFrivolousCase();
          
          // Update ClickUp
          await clickupService.closeFrivolousDispute(dispute.control_number);
        } else {
          // Handle non-frivolous case
          actionResult = await eoscarService.handleNonFrivolousCase(categorization.indicatorDetails);
          
          // Update ClickUp
          await clickupService.escalateNonFrivolousDispute(
            dispute.control_number,
            categorization.indicatorDetails
          );
        }
        
        // Update dispute in Firestore
        const updatedDispute = {
          ...dispute,
          dispute_status: categorization.isFrivolous ? 'Closed' : 'Escalated',
          is_frivolous: categorization.isFrivolous,
          categorization_details: categorization,
          resolution_details: actionResult,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await admin.firestore()
          .collection('disputes')
          .doc(dispute.id)
          .update(updatedDispute);
        
        // Add to reviewed disputes
        reviewedDisputes.push(updatedDispute);
        
        // Log the action
        await admin.firestore().collection('audit_logs').add({
          dispute_id: dispute.id,
          user_id: userId,
          action: categorization.isFrivolous ? 'close_frivolous' : 'escalate_non_frivolous',
          details: {
            categorization,
            actionResult
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Increment progress
        currentProgress += progressPerDispute;
      } catch (error) {
        logger.error(`Error processing dispute ${dispute.control_number}:`, error);
        
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress,
          log: `Error processing dispute ${dispute.control_number}: ${error.message}`
        });
        
        // Update dispute with error status
        await admin.firestore()
          .collection('disputes')
          .doc(dispute.id)
          .update({
            dispute_status: 'Error',
            error_details: {
              message: error.message,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            }
          });
        
        // Log the error
        await admin.firestore().collection('audit_logs').add({
          dispute_id: dispute.id,
          user_id: userId,
          action: 'error',
          details: {
            message: error.message,
            stack: error.stack
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Move to next dispute anyway
        currentProgress += progressPerDispute;
      }
    }
    
    // Close browser
    await eoscarService.cleanup();
    
    // Complete
    await updateStatus({
      userId,
      status: 'complete',
      progress: 100,
      log: `Review process completed. Processed ${reviewedDisputes.length} disputes.`
    });
    
    // Calculate counts
    const frivolousCount = reviewedDisputes.filter(d => d.is_frivolous).length;
    const nonFrivolousCount = reviewedDisputes.filter(d => !d.is_frivolous).length;
    
    // Return results
    return {
      success: true,
      disputes: reviewedDisputes,
      total: reviewedDisputes.length,
      frivolous: frivolousCount,
      nonFrivolous: nonFrivolousCount
    };
  } catch (error) {
    logger.error('Error in reviewDisputes:', error);
    
    await updateStatus({
      userId,
      status: 'error',
      progress: 100,
      message: error.message,
      log: `Error in review process: ${error.message}`
    });
    
    throw new Error(`Review failed: ${error.message}`);
  }
};