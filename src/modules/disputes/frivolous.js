const logger = require('../../services/logger');
const clickupService = require('../../services/clickup');
const supabaseService = require('../../services/supabase');
const constants = require('../../config/constants');

/**
 * Handle a frivolous dispute case
 * @param {Object} page - Puppeteer page object
 * @param {Object} dispute - Dispute object
 * @param {Object} categorization - Categorization details
 * @returns {Promise<Object>} - Updated dispute
 */
async function handleFrivolousCase(page, dispute, categorization) {
  logger.info(`Handling frivolous case for dispute ${dispute.control_number}`);
  
  try {
    // 1. Close the case in E-Oscar
    await closeCaseInEOscar(page);
    
    // 2. Close the ClickUp ticket
    const updatedDispute = await clickupService.processFrivolousDispute(dispute);
    
    // 3. Update the dispute in Supabase
    await supabaseService.updateDispute({
      id: dispute.id,
      is_frivolous: true,
      dispute_status: 'Closed',
      resolution_details: updatedDispute.resolution_details,
      updated_at: new Date().toISOString()
    });
    
    // 4. Log the action to the audit trail
    await supabaseService.logDisputeAction({
      dispute_id: dispute.id,
      action_type: 'close_frivolous',
      action_details: {
        categorization
      }
    });
    
    logger.info(`Successfully handled frivolous case for dispute ${dispute.control_number}`);
    return updatedDispute;
  } catch (error) {
    logger.error(`Error handling frivolous case for dispute ${dispute.control_number}:`, error);
    
    // Log the error to the audit trail
    await supabaseService.logDisputeAction({
      dispute_id: dispute.id,
      action_type: 'error',
      action_details: {
        error: error.message,
        stack: error.stack,
        context: 'handleFrivolousCase'
      }
    });
    
    throw error;
  }
}

/**
 * Close a case in E-Oscar
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function closeCaseInEOscar(page) {
  try {
    logger.info('Closing case in E-Oscar...');
    
    // Click continue button 3 times
    for (let i = 0; i < 3; i++) {
      // Wait for the button to be available
      await page.waitForSelector('button[type="submit"], input[type="submit"], .continue-button, #continueButton', {
        timeout: constants.TIMEOUTS.ELEMENT
      });
      
      // Click the button
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: constants.TIMEOUTS.NAVIGATION }),
        page.click('button[type="submit"], input[type="submit"], .continue-button, #continueButton')
      ]);
      
      logger.info(`Clicked continue button (${i + 1}/3)`);
    }
    
    // Select "01 - Information accurate as of last submission. No changes."
    const responseCodeSelector = 'select[name="responseCode"], #responseCode, .response-code-select';
    await page.waitForSelector(responseCodeSelector, { timeout: constants.TIMEOUTS.ELEMENT });
    await page.select(responseCodeSelector, '01');
    
    // Click Submit button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: constants.TIMEOUTS.NAVIGATION }),
      page.click('button[type="submit"], input[type="submit"], .submit-button, #submitButton')
    ]);
    
    // Check for errors
    const hasError = await page.evaluate(() => {
      return !!document.querySelector('.error, .error-message, #errorMessage');
    });
    
    if (hasError) {
      logger.warn('Error encountered while submitting. Trying clear and submit again...');
      
      // Click Clear Account Information
      await page.click('#clearAccountInfo, .clear-button, button:contains("Clear")');
      
      // Click Submit again
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: constants.TIMEOUTS.NAVIGATION }),
        page.click('button[type="submit"], input[type="submit"], .submit-button, #submitButton')
      ]);
    }
    
    logger.info('Case successfully closed in E-Oscar');
  } catch (error) {
    logger.error(`Error closing case in E-Oscar: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

module.exports = {
  handleFrivolousCase,
  closeCaseInEOscar
};
