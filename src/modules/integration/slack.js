const logger = require('../../services/logger');
const slackService = require('../../services/slack');

/**
 * Send a notification about completed dispute processing
 * @param {Array} results - Results from dispute processing
 * @returns {Promise<void>}
 */
async function sendProcessingResults(results) {
  if (!slackService.slack) {
    logger.warn('Slack integration not configured. Skipping notification.');
    return;
  }
  
  try {
    // Count results by status
    const frivolous = results.filter(r => r.is_frivolous).length;
    const nonFrivolous = results.filter(r => !r.is_frivolous).length;
    const errors = results.filter(r => r.dispute_status === 'Error').length;
    
    // Format message
    const message = `
*E-Oscar Dispute Processing Completed*

*Results:*
• Total Disputes: ${results.length}
• Frivolous: ${frivolous}
• Not Frivolous: ${nonFrivolous}
• Errors: ${errors}

${errors > 0 ? '⚠️ There were errors during processing. Please check the logs.' : '✅ All disputes processed successfully.'}
    `.trim();
    
    // Send to Slack
    await slackService.sendAlert('Dispute Processing Complete', message, errors > 0 ? 'warning' : 'info');
    
    logger.info('Processing results notification sent to Slack');
  } catch (error) {
    logger.error(`Error sending processing results to Slack: ${error.message}`, { stack: error.stack });
  }
}

/**
 * Send report download notification
 * @param {Array} reportResults - Results from report download
 * @returns {Promise<void>}
 */
async function sendReportDownloadResults(reportResults) {
  if (!slackService.slack) {
    logger.warn('Slack integration not configured. Skipping notification.');
    return;
  }
  
  try {
    // Count successful downloads
    const successful = reportResults.filter(r => r.success).length;
    const failed = reportResults.filter(r => !r.success).length;
    
    // Format message
    const message = `
*E-Oscar Report Download Completed*

*Results:*
• Total Clients: ${reportResults.length}
• Successful Downloads: ${successful}
• Failed Downloads: ${failed}

${failed > 0 ? '⚠️ Some downloads failed. Please check the logs.' : '✅ All reports downloaded successfully.'}
    `.trim();
    
    // Add failures if any
    if (failed > 0) {
      const failureDetails = reportResults
        .filter(r => !r.success)
        .map(r => `• ${r.clientName}: ${r.error}`)
        .join('\n');
      
      message += `\n\n*Failed Downloads:*\n${failureDetails}`;
    }
    
    // Send to Slack
    await slackService.sendAlert('Report Download Complete', message, failed > 0 ? 'warning' : 'info');
    
    logger.info('Report download results notification sent to Slack');
  } catch (error) {
    logger.error(`Error sending report download results to Slack: ${error.message}`, { stack: error.stack });
  }
}

module.exports = {
  sendProcessingResults,
  sendReportDownloadResults
};
