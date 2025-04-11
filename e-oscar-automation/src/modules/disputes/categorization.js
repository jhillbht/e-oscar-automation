const logger = require('../../services/logger');
const constants = require('../../config/constants');

// Determine if we're in test mode
const TEST_MODE = process.env.TEST_MODE === 'true';

// Import mock data if in test mode
const mockData = TEST_MODE ? require('../../test/mock-data') : null;

/**
 * Categorize a dispute as frivolous or not based on business rules
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<Object>} - Categorization result
 */
async function categorizeDispute(page) {
  logger.info('Categorizing dispute...');
  
  // In test mode, use mock case details
  if (TEST_MODE) {
    // Get a random case detail from mock data
    const mockCaseDetail = mockData.mockCaseDetails[Math.floor(Math.random() * mockData.mockCaseDetails.length)];
    logger.info('TEST MODE: Using mock case details for categorization');
    
    // Determine if frivolous based on the mock data
    let isFrivolous = true;
    let nonFrivolousReason = null;
    let indicatorDetails = null;
    
    // Apply categorization rules to mock data
    for (const indicator of constants.DISPUTE_RULES.NON_FRIVOLOUS_INDICATORS) {
      const fieldValue = mockCaseDetail[indicator.field];
      
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
        caseDetails: mockCaseDetail,
        nonFrivolousReason,
        indicatorDetails
      }
    };
    
    logger.info(`TEST MODE: Dispute categorized as ${isFrivolous ? 'FRIVOLOUS' : 'NOT FRIVOLOUS'}${nonFrivolousReason ? ': ' + nonFrivolousReason : ''}`);
    
    return result;
  }
  
  // Normal implementation would follow here...
  // [implementation omitted for brevity]
  throw new Error('Non-test mode not implemented in this test version');
}

module.exports = {
  categorizeDispute
};
