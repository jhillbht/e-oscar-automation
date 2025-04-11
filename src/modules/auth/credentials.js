const supabaseService = require('../../services/supabase');
const sheetsService = require('../../services/sheets');
const logger = require('../../services/logger');
const slackService = require('../../services/slack');

/**
 * Get credentials for a client
 * @param {string} clientName - Client name
 * @returns {Promise<Object>} - Credentials object
 */
async function getClientCredentials(clientName) {
  try {
    // First try to get credentials from Supabase
    try {
      const credentials = await supabaseService.getCredentials(clientName);
      logger.info(`Found credentials for ${clientName} in Supabase`);
      return credentials;
    } catch (error) {
      logger.warn(`Could not get credentials from Supabase: ${error.message}. Falling back to Google Sheets.`);
    }
    
    // Fallback to Google Sheets
    const allCredentials = await sheetsService.getCredentials();
    const credential = allCredentials.find(cred => 
      cred.ClientName?.toLowerCase() === clientName.toLowerCase() ||
      cred.Username?.toLowerCase() === clientName.toLowerCase()
    );
    
    if (!credential) {
      throw new Error(`No credentials found for client: ${clientName}`);
    }
    
    logger.info(`Found credentials for ${clientName} in Google Sheets`);
    
    return {
      username: credential.Username,
      password: credential.Password,
      client_name: credential.ClientName || clientName
    };
  } catch (error) {
    logger.error(`Error getting credentials for ${clientName}: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Get all active clients
 * @returns {Promise<Array>} - Array of client objects
 */
async function getAllClients() {
  try {
    // First try to get clients from Supabase
    try {
      const clients = await supabaseService.getAllActiveClients();
      if (clients && clients.length > 0) {
        logger.info(`Found ${clients.length} clients in Supabase`);
        return clients;
      }
    } catch (error) {
      logger.warn(`Could not get clients from Supabase: ${error.message}. Falling back to Google Sheets.`);
    }
    
    // Fallback to Google Sheets
    const credentials = await sheetsService.getCredentials();
    
    if (!credentials || credentials.length === 0) {
      throw new Error('No credentials found');
    }
    
    logger.info(`Found ${credentials.length} clients in Google Sheets`);
    
    return credentials.map(cred => ({
      username: cred.Username,
      password: cred.Password,
      client_name: cred.ClientName || cred.Username
    }));
  } catch (error) {
    logger.error(`Error getting all clients: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Check for expiring passwords and send alerts
 * @param {number} daysThreshold - Days threshold to check
 * @returns {Promise<Array>} - Array of expiring credentials
 */
async function checkExpiringPasswords(daysThreshold = 7) {
  try {
    const expiringCredentials = await supabaseService.checkExpiringPasswords(daysThreshold);
    
    if (expiringCredentials && expiringCredentials.length > 0) {
      logger.warn(`Found ${expiringCredentials.length} credentials with passwords expiring soon`);
      
      // Send alert to Slack
      const message = expiringCredentials.map(cred => {
        const daysLeft = Math.ceil((new Date(cred.password_expires) - new Date()) / (1000 * 60 * 60 * 24));
        return `• ${cred.client_name} (${cred.username}): Expires in ${daysLeft} days`;
      }).join('\n');
      
      await slackService.sendAlert(
        'Password Expiration Warning',
        `The following E-Oscar passwords will expire soon:\n${message}\n\nPlease update these passwords in the E-Oscar system and in Supabase.`,
        'warning'
      );
    } else {
      logger.info('No expiring passwords found');
    }
    
    return expiringCredentials || [];
  } catch (error) {
    logger.error(`Error checking expiring passwords: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

module.exports = { 
  getClientCredentials,
  getAllClients,
  checkExpiringPasswords
};
