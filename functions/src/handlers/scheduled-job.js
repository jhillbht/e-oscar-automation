const admin = require('firebase-admin');
const { eoscarService } = require('../services/eoscar');
const { googleSheetsService } = require('../services/google-sheets');
const { clickupService } = require('../services/clickup');
const { getCredentials } = require('../services/credentials');
const { logger } = require('../utils/logger');
const { sendEmailNotification } = require('../utils/notifications');

/**
 * Handler for scheduled job (runs daily)
 * @param {Object} context - Function context
 * @returns {Promise<void>}
 */
exports.scheduledJobHandler = async (context) => {
  logger.info('Starting scheduled job');
  
  try {
    // Determine date range
    const today = new Date();
    const isMonday = today.getDay() === 1;
    
    let startDate, endDate;
    
    if (isMonday) {
      // If Monday, include the weekend (Friday to Sunday)
      const friday = new Date(today);
      friday.setDate(today.getDate() - 3);
      startDate = formatDate(friday);
    } else {
      // Otherwise, just use yesterday
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      startDate = formatDate(yesterday);
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    endDate = formatDate(yesterday);
    
    logger.info(`Date range: ${startDate} to ${endDate}`);
    
    // Record job start
    const jobRef = await admin.firestore().collection('automated_jobs').add({
      type: 'scheduled_daily',
      start_time: admin.firestore.FieldValue.serverTimestamp(),
      status: 'running',
      date_range: { startDate, endDate }
    });
    
    // Part 1: Download Reports
    await updateJobStatus(jobRef.id, 'Downloading reports');
    
    // Get all active credentials
    const credentialsList = await getCredentials('all');
    
    if (!credentialsList || credentialsList.length === 0) {
      throw new Error('No active credentials found');
    }
    
    // Initialize E-Oscar service
    await eoscarService.initialize();
    
    // Track downloaded reports
    const downloadedReports = [];
    
    // Process each client
    for (const credential of credentialsList) {
      try {
        logger.info(`Processing client: ${credential.client_name}`);
        
        // Login
        await eoscarService.login(credential.username, credential.password);
        
        // Generate report
        const report = await eoscarService.generateReport({
          startDate,
          endDate,
          clientName: credential.client_name
        });
        
        downloadedReports.push({
          clientName: credential.client_name,
          data: report
        });
        
        logger.info(`Successfully downloaded report for ${credential.client_name} with ${report.length} disputes`);
      } catch (error) {
        logger.error(`Error processing client ${credential.client_name}:`, error);
        
        // Continue with next client anyway
        continue;
      }
    }
    
    // Process downloaded reports
    logger.info('Processing downloaded reports');
    
    // Combine and format disputes
    const disputes = [];
    
    downloadedReports.forEach(report => {
      if (report.data && report.data.length > 0) {
        report.data.forEach(dispute => {
          disputes.push({
            client_name: report.clientName,
            control_number: dispute.control_number.replace(/^\*/, ''), // Remove leading "*"
            date_furnished: dispute.date_furnished,
            date_received: dispute.date_received,
            response_due_date: dispute.response_due_date,
            first_name: dispute.first_name,
            last_name: dispute.last_name,
            dispute_status: 'Pending',
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        });
      }
    });
    
    // Upload to Google Sheets
    logger.info(`Uploading ${disputes.length} disputes to Google Sheets`);
    await googleSheetsService.uploadDisputes(disputes);
    
    // Store disputes in Firestore
    logger.info('Storing disputes in database');
    
    const batch = admin.firestore().batch();
    
    disputes.forEach(dispute => {
      const disputeRef = admin.firestore().collection('disputes').doc();
      batch.set(disputeRef, dispute);
    });
    
    await batch.commit();
    
    // Part 2: Review Disputes
    await updateJobStatus(jobRef.id, 'Reviewing disputes');
    
    // Process disputes with the already initialized browser
    for (const dispute of disputes) {
      try {
        logger.info(`Processing dispute: ${dispute.control_number}`);
        
        // Get dispute document ID
        const disputeSnapshot = await admin.firestore()
          .collection('disputes')
          .where('control_number', '==', dispute.control_number)
          .where('client_name', '==', dispute.client_name)
          .limit(1)
          .get();
        
        if (disputeSnapshot.empty) {
          logger.warn(`Dispute document not found for ${dispute.control_number}`);
          continue;
        }
        
        const disputeDoc = disputeSnapshot.docs[0];
        const disputeId = disputeDoc.id;
        
        // Search for the case
        await eoscarService.searchCase(dispute.control_number);
        
        // Categorize the dispute
        const categorization = await eoscarService.categorizeDispute();
        
        // Take appropriate action based on categorization
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
        await admin.firestore()
          .collection('disputes')
          .doc(disputeId)
          .update({
            dispute_status: categorization.isFrivolous ? 'Closed' : 'Escalated',
            is_frivolous: categorization.isFrivolous,
            categorization_details: categorization,
            resolution_details: actionResult,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        
        // Log the action
        await admin.firestore().collection('audit_logs').add({
          dispute_id: disputeId,
          user_id: 'system',
          action: categorization.isFrivolous ? 'close_frivolous' : 'escalate_non_frivolous',
          details: {
            categorization,
            actionResult
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        logger.error(`Error processing dispute ${dispute.control_number}:`, error);
        
        // Try to get the dispute document ID
        try {
          const disputeSnapshot = await admin.firestore()
            .collection('disputes')
            .where('control_number', '==', dispute.control_number)
            .where('client_name', '==', dispute.client_name)
            .limit(1)
            .get();
          
          if (!disputeSnapshot.empty) {
            const disputeId = disputeSnapshot.docs[0].id;
            
            // Update dispute with error status
            await admin.firestore()
              .collection('disputes')
              .doc(disputeId)
              .update({
                dispute_status: 'Error',
                error_details: {
                  message: error.message,
                  timestamp: admin.firestore.FieldValue.serverTimestamp()
                }
              });
            
            // Log the error
            await admin.firestore().collection('audit_logs').add({
              dispute_id: disputeId,
              user_id: 'system',
              action: 'error',
              details: {
                message: error.message,
                stack: error.stack
              },
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (logError) {
          logger.error('Error logging dispute error:', logError);
        }
        
        // Continue with next dispute anyway
        continue;
      }
    }
    
    // Close browser
    await eoscarService.cleanup();
    
    // Complete job
    await updateJobStatus(jobRef.id, 'completed', {
      total_disputes: disputes.length,
      frivolous: disputes.filter(d => d.is_frivolous).length,
      non_frivolous: disputes.filter(d => !d.is_frivolous).length,
    });
    
    // Send notification email
    await sendEmailNotification({
      subject: `E-Oscar Automation - ${disputes.length} disputes processed`,
      message: `
        Date Range: ${startDate} to ${endDate}
        Total Disputes: ${disputes.length}
        Frivolous: ${disputes.filter(d => d.is_frivolous).length}
        Non-Frivolous: ${disputes.filter(d => !d.is_frivolous).length}
      `
    });
    
    logger.info('Scheduled job completed successfully');
  } catch (error) {
    logger.error('Error in scheduled job:', error);
    
    // Try to clean up
    try {
      await eoscarService.cleanup();
    } catch (cleanupError) {
      logger.error('Error during cleanup:', cleanupError);
    }
    
    // Send error notification
    await sendEmailNotification({
      subject: 'E-Oscar Automation - Error',
      message: `An error occurred in the scheduled automation job: ${error.message}`
    });
    
    throw error;
  }
};

/**
 * Helper function to format date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Update job status in Firestore
 * @param {string} jobId - Job document ID
 * @param {string} status - Current status
 * @param {Object} details - Additional details
 * @returns {Promise<void>}
 */
async function updateJobStatus(jobId, status, details = {}) {
  await admin.firestore().collection('automated_jobs').doc(jobId).update({
    status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    ...details
  });
}