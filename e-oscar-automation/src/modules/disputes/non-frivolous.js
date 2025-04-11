const logger = require('../../services/logger');

// Determine if we're in test mode
const TEST_MODE = process.env.TEST_MODE === 'true';

/**
 * Handle a non-frivolous dispute case
 * @param {Object} page - Puppeteer page object
 * @param {Object} dispute - Dispute object
 * @param {Object} categorization - Categorization results
 * @returns {Promise<Object>} - Updated dispute
 */
async function handleNonFrivolousCase(page, dispute, categorization) {
  logger.info(`${TEST_MODE ? 'TEST MODE: ' : ''}Handling non-frivolous case for dispute ${dispute.control_number}`);
  
  // In test mode, simulate handling
  if (TEST_MODE) {
    // Extract the indicator details
    const indicatorDetails = categorization.details.indicatorDetails;
    
    // Simulate ClickUp updates
    logger.info('TEST MODE: Simulating updating ClickUp with non-frivolous indicators');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return updated dispute
    return {
      ...dispute,
      is_frivolous: false,
      dispute_status: 'Escalated',
      resolution_details: {
        indicatorDetails,
        clickupComment: `This dispute has been categorized as NOT FRIVOLOUS.\n\nIndicator: ${indicatorDetails}`,
        clickupStatus: 'NEED TO ESCALATE'
      }
    };
  }
  
  // Normal implementation would follow here...
  // [implementation omitted for brevity]
  throw new Error('Non-test mode not implemented in this test version');
}

module.exports = {
  handleNonFrivolousCase
};
