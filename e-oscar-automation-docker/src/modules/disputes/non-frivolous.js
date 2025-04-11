const logger = require('../../services/logger');

/**
 * Handle a non-frivolous dispute case
 * @param {Object} page - Puppeteer page object
 * @param {Object} dispute - Dispute object
 * @param {Object} categorization - Categorization results
 * @returns {Promise<Object>} - Updated dispute
 */
async function handleNonFrivolousCase(page, dispute, categorization) {
  logger.info(`Handling non-frivolous case for dispute ${dispute.control_number}`);
  
  try {
    // 1. Extract the full indicator details text
    const indicatorDetails = categorization.details.indicatorDetails;
    
    // 2. In production, this would update ClickUp and Supabase
    const updatedDispute = {
      ...dispute,
      dispute_status: 'Escalated',
      is_frivolous: false,
      resolution_details: {
        indicatorDetails,
        clickupComment: `This dispute has been categorized as NOT FRIVOLOUS.\n\nIndicator: ${indicatorDetails}`,
        clickupStatus: 'NEED TO ESCALATE'
      }
    };
    
    logger.info(`Successfully handled non-frivolous case for dispute ${dispute.control_number}`);
    return updatedDispute;
  } catch (error) {
    logger.error(`Error handling non-frivolous case for dispute ${dispute.control_number}:`, error);
    throw error;
  }
}

module.exports = {
  handleNonFrivolousCase
};
