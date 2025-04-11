const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://rbipwoarcmbqpeolyyzt.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  throw new Error('SUPABASE_KEY environment variable is required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get credentials for a specific client
 * @param {string} clientName - Client name
 * @returns {Promise<Object>} - Credentials object
 */
async function getCredentials(clientName) {
  try {
    logger.info(`Getting credentials for client: ${clientName}`);
    const { data, error } = await supabase
      .rpc('get_active_credentials', { p_client_name: clientName });
    
    if (error) {
      throw new Error(`Error retrieving credentials: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error(`No active credentials found for client: ${clientName}`);
    }
    
    return data[0];
  } catch (error) {
    logger.error(`Error getting credentials: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Get all active clients
 * @returns {Promise<Array>} - Array of client objects
 */
async function getAllActiveClients() {
  try {
    const { data, error } = await supabase
      .rpc('get_active_credentials');
    
    if (error) {
      throw new Error(`Error retrieving clients: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    logger.error(`Error getting all clients: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Check for expiring passwords
 * @param {number} daysThreshold - Days threshold to check
 * @returns {Promise<Array>} - Array of expiring credentials
 */
async function checkExpiringPasswords(daysThreshold = 7) {
  try {
    const { data, error } = await supabase
      .rpc('check_expiring_passwords', { days_threshold: daysThreshold });
    
    if (error) {
      throw new Error(`Error checking expiring passwords: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    logger.error(`Error checking expiring passwords: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Update password for a credential
 * @param {string} credentialId - Credential ID
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Updated credential object
 */
async function updatePassword(credentialId, newPassword) {
  try {
    const { data, error } = await supabase
      .from('eoscar_credentials')
      .update({ password: newPassword })
      .eq('id', credentialId)
      .select();
    
    if (error) {
      throw new Error(`Error updating password: ${error.message}`);
    }
    
    return data[0];
  } catch (error) {
    logger.error(`Error updating password: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Create a new dispute in Supabase
 * @param {Object} dispute - Dispute object
 * @returns {Promise<Object>} - Created dispute
 */
async function createDispute(dispute) {
  try {
    const { data, error } = await supabase
      .from('eoscar_dispute_details')
      .upsert([
        {
          client_name: dispute.client_name,
          control_number: dispute.control_number,
          date_furnisher: dispute.date_furnisher,
          date_received: dispute.date_received,
          response_due_date: dispute.response_due_date,
          first_name: dispute.first_name,
          last_name: dispute.last_name,
          dispute_status: 'Pending'
        }
      ], { onConflict: 'client_name,control_number' })
      .select();
    
    if (error) {
      throw new Error(`Error creating dispute: ${error.message}`);
    }
    
    return data[0];
  } catch (error) {
    logger.error(`Error creating dispute: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Update a dispute in Supabase
 * @param {Object} dispute - Dispute object with id
 * @returns {Promise<Object>} - Updated dispute
 */
async function updateDispute(dispute) {
  try {
    const { data, error } = await supabase
      .from('eoscar_dispute_details')
      .update(dispute)
      .eq('id', dispute.id)
      .select();
    
    if (error) {
      throw new Error(`Error updating dispute: ${error.message}`);
    }
    
    return data[0];
  } catch (error) {
    logger.error(`Error updating dispute: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Get pending disputes for a client
 * @param {string} clientName - Client name
 * @returns {Promise<Array>} - Array of dispute objects
 */
async function getPendingDisputes(clientName) {
  try {
    let query = supabase
      .from('eoscar_dispute_details')
      .select('*')
      .eq('dispute_status', 'Pending')
      .order('response_due_date', { ascending: true });
    
    if (clientName) {
      query = query.eq('client_name', clientName);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Error retrieving disputes: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    logger.error(`Error getting pending disputes: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Log an action for a dispute
 * @param {Object} params - Action parameters
 * @param {string} params.dispute_id - Dispute ID
 * @param {string} params.action_type - Action type
 * @param {Object} params.action_details - Action details
 * @returns {Promise<void>}
 */
async function logDisputeAction({ dispute_id, action_type, action_details }) {
  try {
    const { error } = await supabase.rpc('log_dispute_action', {
      p_dispute_id: dispute_id,
      p_action_type: action_type,
      p_action_details: action_details
    });
    
    if (error) {
      throw new Error(`Error logging dispute action: ${error.message}`);
    }
  } catch (error) {
    logger.error(`Error logging dispute action: ${error.message}`, { stack: error.stack });
    // Don't throw here - we don't want logging failures to break the main flow
  }
}

module.exports = {
  supabase,
  getCredentials,
  getAllActiveClients,
  checkExpiringPasswords,
  updatePassword,
  createDispute,
  updateDispute,
  getPendingDisputes,
  logDisputeAction
};
