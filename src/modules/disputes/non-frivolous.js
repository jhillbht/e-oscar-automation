const logger = require('../../services/logger');
const clickupService = require('../../services/clickup');
const supabaseService = require('../../services/supabase');

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
    const indicatorDetails = categorization.indicatorDetails;
    
    // 2. Add comment to ClickUp ticket and change status
    const updatedDispute = await clickupService.processNonFrivolousDispute(
      dispute, 
      indicatorDetails
    );
    
    // 3. Update the dispute in Supabase
    await supabaseService.updateDispute({
      id: dispute.id,
      is_frivolous: false,
      dispute_status: 'Escalated',
      resolution_details: updatedDispute.resolution_details,
      updated_at: new Date().toISOString()
    });
    
    // 4. Log the action to the audit trail
    await supabaseService.logDisputeAction({
      dispute_id: dispute.id,
      action_type: 'escalate_non_frivolous',
      action_details: {
        indicator: indicatorDetails,
        reason: categorization.nonFrivolousReason,
        categorization
      }
    });
    
    logger.info(`Successfully handled non-frivolous case for dispute ${dispute.control_number}`);
    return updatedDispute;
  } catch (error) {
    logger.error(`Error handling non-frivolous case for dispute ${dispute.control_number}:`, error);
    
    // Log the error to the audit trail
    await supabaseService.logDisputeAction({
      dispute_id: dispute.id,
      action_type: 'error',
      action_details: {
        error: error.message,
        stack: error.stack,
        context: 'handleNonFrivolousCase'
      }
    });
    
    throw error;
  }
}

/**
 * Extract non-frivolous indicator from case page
 * @param {Object} page - Puppeteer page object
 * @param {string} indicator - Indicator type (disputeCode1, disputeCode2, images, fcraRelevantInfo)
 * @returns {Promise<string>} - Indicator details text
 */
async function extractIndicatorDetails(page, indicator) {
  try {
    // Select the appropriate selector based on indicator type
    let selector;
    switch (indicator) {
      case 'disputeCode1':
        selector = '#disputeCode1, .dispute-code-1, [data-field="disputeCode1"]';
        break;
      case 'disputeCode2':
        selector = '#disputeCode2, .dispute-code-2, [data-field="disputeCode2"]';
        break;
      case 'images':
        selector = '#images, .images, [data-field="images"]';
        break;
      case 'fcraRelevantInfo':
        selector = '#fcraRelevantInfo, .fcra-relevant-info, [data-field="fcraRelevantInfo"]';
        break;
      default:
        throw new Error(`Unknown indicator type: ${indicator}`);
    }
    
    // Extract the text content
    const indicatorText = await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      return element ? element.textContent.trim() : null;
    }, selector);
    
    if (!indicatorText) {
      throw new Error(`Could not extract indicator details for ${indicator}`);
    }
    
    // Format the indicator text
    const formattedText = `${indicator}: ${indicatorText}`;
    
    return formattedText;
  } catch (error) {
    logger.error(`Error extracting indicator details for ${indicator}:`, error);
    throw error;
  }
}

module.exports = {
  handleNonFrivolousCase,
  extractIndicatorDetails
};
