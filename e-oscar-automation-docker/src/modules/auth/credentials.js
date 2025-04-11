const logger = require('../../services/logger');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://rbipwoarcmbqpeolyyzt.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get credentials for a client
 * @param {string} clientName - Client name
 * @returns {Promise<Object>} - Credentials object
 */
async function getClientCredentials(clientName) {
  try {
    logger.info(`Retrieving credentials for client: ${clientName}`);
    
    // Call the Supabase stored procedure to get active credentials
    const { data, error } = await supabase
      .rpc('get_active_credentials', { p_client_name: clientName });
    
    if (error) {
      logger.error(`Error retrieving credentials: ${error.message}`);
      throw new Error(`Error retrieving credentials: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      logger.error(`No active credentials found for client: ${clientName}`);
      throw new Error(`No active credentials found for client: ${clientName}`);
    }
    
    logger.info(`Successfully retrieved credentials for client: ${clientName}`);
    
    // Return the first credential for this client
    return data[0];
  } catch (error) {
    logger.error(`Error getting credentials for ${clientName}: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Check for credentials expiring soon
 * @param {number} daysThreshold - Days threshold for expiration check (default: 7)
 * @returns {Promise<Array>} - Array of expiring credentials
 */
async function checkExpiringPasswords(daysThreshold = 7) {
  try {
    logger.info(`Checking for credentials expiring within ${daysThreshold} days`);
    
    const { data, error } = await supabase
      .rpc('check_expiring_passwords', { days_threshold: daysThreshold });
    
    if (error) {
      logger.error(`Error checking expiring passwords: ${error.message}`);
      throw new Error(`Error checking expiring passwords: ${error.message}`);
    }
    
    if (data && data.length > 0) {
      logger.warn(`Found ${data.length} credentials expiring soon`);
    } else {
      logger.info('No credentials expiring soon');
    }
    
    return data || [];
  } catch (error) {
    logger.error(`Error checking expiring passwords: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Update password after it's been changed in E-Oscar
 * @param {string} clientName - Client name
 * @param {string} username - Username
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} - Success status
 */
async function updatePassword(clientName, username, newPassword) {
  try {
    logger.info(`Updating password for ${username} (${clientName})`);
    
    // First, get the credential ID
    const { data: credentials, error: findError } = await supabase
      .from('eoscar_credentials')
      .select('id')
      .eq('username', username)
      .eq('client_name', clientName)
      .limit(1);
    
    if (findError) {
      logger.error(`Error finding credential: ${findError.message}`);
      throw new Error(`Error finding credential: ${findError.message}`);
    }
    
    if (!credentials || credentials.length === 0) {
      logger.error(`No credential found for username ${username} and client ${clientName}`);
      throw new Error(`No credential found for username ${username} and client ${clientName}`);
    }
    
    const credentialId = credentials[0].id;
    
    // Update the password
    const { error: updateError } = await supabase
      .from('eoscar_credentials')
      .update({ password: newPassword })
      .eq('id', credentialId);
    
    if (updateError) {
      logger.error(`Error updating password: ${updateError.message}`);
      throw new Error(`Error updating password: ${updateError.message}`);
    }
    
    logger.info(`Successfully updated password for ${username} (${clientName})`);
    return true;
  } catch (error) {
    logger.error(`Error updating password: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

module.exports = { 
  getClientCredentials,
  checkExpiringPasswords,
  updatePassword
};