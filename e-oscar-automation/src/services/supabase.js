const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://rbipwoarcmbqpeolyyzt.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;
if (supabaseKey && supabaseKey !== 'test-key') {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  logger.warn('SUPABASE_KEY not provided or is test key. Supabase integration will be simulated.');
}

/**
 * Get credentials for a specific client
 * @param {string} clientName - Client name
 * @returns {Promise<Object>} - Credentials object
 */
async function getCredentials(clientName) {
  try {
    // Handle debug mode
    if (process.env.DEBUG_MODE === 'true') {
      logger.info(`DEBUG MODE: Returning mock credentials for ${clientName}`);
      return {
        id: 'mock-id',
        username: clientName || 'test-user',
        password: 'test-password',
        client_name: clientName || 'Test Client',
        password_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

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
 * Get pending disputes for a client
 * @param {string} clientName - Client name
 * @returns {Promise<Array>} - Array of dispute objects
 */
async function getPendingDisputes(clientName) {
  try {
    // Handle debug mode
    if (process.env.DEBUG_MODE === 'true') {
      logger.info(`DEBUG MODE: Returning mock pending disputes${clientName ? ` for ${clientName}` : ''}`);
      return [
        {
          id: 'mock-dispute-1',
          client_name: clientName || 'Test Client',
          control_number: 'MOCK123456',
          date_furnisher: 'Test Account',
          date_received: '2023-04-01',
          response_due_date: '2023-04-30',
          first_name: 'John',
          last_name: 'Doe',
          dispute_status: 'Pending',
          clickup_task_id: 'mock-task-1'
        },
        {
          id: 'mock-dispute-2',
          client_name: clientName || 'Test Client',
          control_number: 'MOCK654321',
          date_furnisher: 'Another Account',
          date_received: '2023-04-02',
          response_due_date: '2023-04-30',
          first_name: 'Jane',
          last_name: 'Smith',
          dispute_status: 'Pending',
          clickup_task_id: 'mock-task-2'
        }
      ];
    }

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
 * Update a dispute in Supabase
 * @param {Object} dispute - Dispute object with id
 * @returns {Promise<Object>} - Updated dispute
 */
async function updateDispute(dispute) {
  try {
    // Handle debug mode
    if (process.env.DEBUG_MODE === 'true') {
      logger.info(`DEBUG MODE: Would update dispute ${dispute.id} with status ${dispute.dispute_status}`);
      return dispute;
    }

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
 * Log an action for a dispute
 * @param {Object} params - Action parameters
 * @param {string} params.dispute_id - Dispute ID
 * @param {string} params.action_type - Action type
 * @param {Object} params.action_details - Action details
 * @returns {Promise<void>}
 */
async function logDisputeAction({ dispute_id, action_type, action_details }) {
  try {
    // Handle debug mode
    if (process.env.DEBUG_MODE === 'true') {
      logger.info(`DEBUG MODE: Would log action ${action_type} for dispute ${dispute_id}`);
      return;
    }

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
  getPendingDisputes,
  updateDispute,
  logDisputeAction
};
