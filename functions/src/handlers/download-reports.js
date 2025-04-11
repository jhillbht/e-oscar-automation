const admin = require('firebase-admin');
const { getCredentials } = require('../services/credentials');
const { eoscarService } = require('../services/eoscar');
const { googleSheetsService } = require('../services/google-sheets');
const { logger } = require('../utils/logger');
const { updateStatus } = require('../utils/status');

/**
 * Handler for downloadReports function
 * @param {Object} data - Function data
 * @param {Object} context - Function context
 * @returns {Promise<Object>} - Results of the download operation
 */
exports.downloadReportsHandler = async (data, context) => {
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
      message: 'Starting download process',
      log: 'Initializing download process'
    });
    
    // Get credentials
    await updateStatus({
      userId,
      status: 'running',
      progress: 5,
      log: `Getting credentials for ${clientName === 'all' ? 'all clients' : clientName}`
    });
    
    const credentialsList = await getCredentials(clientName);
    
    if (!credentialsList || credentialsList.length === 0) {
      throw new Error(`No credentials found for ${clientName === 'all' ? 'any client' : clientName}`);
    }
    
    // Prepare browser
    await updateStatus({
      userId,
      status: 'running',
      progress: 10,
      log: 'Launching browser'
    });
    
    await eoscarService.initialize();
    
    // Track downloaded reports
    const downloadedReports = [];
    let currentProgress = 10;
    const progressPerClient = 80 / credentialsList.length;
    
    // Process each client
    for (let i = 0; i < credentialsList.length; i++) {
      const credential = credentialsList[i];
      
      try {
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress,
          log: `Processing client: ${credential.client_name}`
        });
        
        // Login
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress + (progressPerClient * 0.2),
          log: `Logging in as ${credential.username}`
        });
        
        await eoscarService.login(credential.username, credential.password);
        
        // Handle OTP if needed (covered by eoscarService.login)
        
        // Generate report
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress + (progressPerClient * 0.5),
          log: `Generating report for ${credential.client_name}`
        });
        
        const report = await eoscarService.generateReport({
          startDate,
          endDate,
          clientName: credential.client_name
        });
        
        downloadedReports.push({
          clientName: credential.client_name,
          data: report
        });
        
        // Log success
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress + (progressPerClient * 0.8),
          log: `Successfully downloaded report for ${credential.client_name} with ${report.length} disputes`
        });
        
        // Increment progress
        currentProgress += progressPerClient;
      } catch (error) {
        logger.error(`Error processing client ${credential.client_name}:`, error);
        
        await updateStatus({
          userId,
          status: 'running',
          progress: currentProgress,
          log: `Error processing client ${credential.client_name}: ${error.message}`
        });
        
        // Move to next client anyway
        currentProgress += progressPerClient;
      }
    }
    
    // Close browser
    await eoscarService.cleanup();
    
    // Process downloaded reports
    await updateStatus({
      userId,
      status: 'running',
      progress: 90,
      log: 'Processing downloaded reports'
    });
    
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
    await updateStatus({
      userId,
      status: 'running',
      progress: 95,
      log: `Uploading ${disputes.length} disputes to Google Sheets`
    });
    
    await googleSheetsService.uploadDisputes(disputes);
    
    // Store disputes in Firestore
    await updateStatus({
      userId,
      status: 'running',
      progress: 98,
      log: 'Storing disputes in database'
    });
    
    const batch = admin.firestore().batch();
    
    disputes.forEach(dispute => {
      const disputeRef = admin.firestore().collection('disputes').doc();
      batch.set(disputeRef, dispute);
    });
    
    await batch.commit();
    
    // Complete
    await updateStatus({
      userId,
      status: 'complete',
      progress: 100,
      log: `Download process completed. Downloaded ${disputes.length} disputes.`
    });
    
    // Return results
    return {
      success: true,
      disputes,
      total: disputes.length
    };
  } catch (error) {
    logger.error('Error in downloadReports:', error);
    
    await updateStatus({
      userId,
      status: 'error',
      progress: 100,
      message: error.message,
      log: `Error in download process: ${error.message}`
    });
    
    throw new Error(`Download failed: ${error.message}`);
  }
};