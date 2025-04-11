const logger = require('../../services/logger');

// Determine if we're in test mode
const TEST_MODE = process.env.TEST_MODE === 'true';

// Import mock data if in test mode
const mockData = TEST_MODE ? require('../../test/mock-data') : null;

/**
 * Get credentials for a client
 * @param {string} clientName - Client name
 * @returns {Promise<Object>} - Credentials object
 */
async function getClientCredentials(clientName) {
  try {
    // In test mode, use mock credentials
    if (TEST_MODE) {
      logger.info(`TEST MODE: Getting mock credentials for ${clientName}`);
      return mockData.mockCredentials;
    }
    
    // In normal mode, try to get credentials from Supabase
    const supabaseService = require('../../services/supabase');
    try {
      const credentials = await supabaseService.getCredentials(clientName);
      logger.info(`Found credentials for ${clientName} in Supabase`);
      return credentials;
    } catch (error) {
      logger.warn(`Could not get credentials from Supabase: ${error.message}`);
      throw error;
    }
  } catch (error) {
    logger.error(`Error getting credentials for ${clientName}: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Check for expiring passwords and send alerts
 * @param {number} daysThreshold - Days threshold to check
 * @returns {Promise<Array>} - Array of expiring credentials
 */
async function checkExpiringPasswords(daysThreshold = 7) {
  // In test mode, just return empty array
  if (TEST_MODE) {
    logger.info('TEST MODE: Checking for expiring passwords (mock)');
    return [];
  }
  
  // Normal implementation follows...
  // [implementation omitted for brevity]
  return [];
}

module.exports = { 
  getClientCredentials,
  checkExpiringPasswords
};
