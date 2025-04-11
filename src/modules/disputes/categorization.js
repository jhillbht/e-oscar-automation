const logger = require('../../services/logger');
const constants = require('../../config/constants');

/**
 * Categorize a dispute as frivolous or not based on business rules
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<Object>} - Categorization result
 */
async function categorizeDispute(page) {
  logger.info('Categorizing dispute...');
  
  // Extract the relevant fields from the case page
  const caseDetails = await extractCaseDetails(page);
  
  logger.info('Case details extracted:', caseDetails);
  
  // Apply categorization rules
  let isFrivolous = true;
  let nonFrivolousReason = null;
  let indicatorDetails = null;
  
  // Check each non-frivolous indicator
  for (const indicator of constants.DISPUTE_RULES.NON_FRIVOLOUS_INDICATORS) {
    const fieldValue = caseDetails[indicator.field];
    
    if (indicator.condition(fieldValue)) {
      isFrivolous = false;
      nonFrivolousReason = indicator.reason;
      indicatorDetails = `${indicator.field}: ${fieldValue}`;
      break;
    }
  }
  
  const result = {
    isFrivolous,
    details: {
      caseDetails,
      nonFrivolousReason,
      indicatorDetails
    }
  };
  
  logger.info(`Dispute categorized as ${isFrivolous ? 'FRIVOLOUS' : 'NOT FRIVOLOUS'}${nonFrivolousReason ? ': ' + nonFrivolousReason : ''}`);
  
  return result;
}

/**
 * Extract case details from the page
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<Object>} - Case details
 */
async function extractCaseDetails(page) {
  try {
    return await page.evaluate(() => {
      // Helper function to get text content with fallbacks for different selectors
      const getText = (selectors) => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            return element.textContent.trim();
          }
        }
        return null;
      };
      
      return {
        disputeCode1: getText(['#disputeCode1', '.dispute-code-1', '[data-field="disputeCode1"]']),
        disputeCode2: getText(['#disputeCode2', '.dispute-code-2', '[data-field="disputeCode2"]']),
        images: getText(['#images', '.images', '[data-field="images"]']),
        fcraRelevantInfo: getText(['#fcraRelevantInfo', '.fcra-relevant-info', '[data-field="fcraRelevantInfo"]'])
      };
    });
  } catch (error) {
    logger.error(`Error extracting case details: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

module.exports = {
  categorizeDispute,
  extractCaseDetails
};
