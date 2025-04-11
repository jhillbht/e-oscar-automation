const { createClient } = require('@supabase/supabase-js');
const logger = require('../logger');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://rbipwoarcmbqpeolyyzt.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get a dispute by control number
 * @param {string} controlNumber - The dispute control number
 * @returns {Promise<Object>} - The dispute object
 */
async function getDisputeByControlNumber(controlNumber) {
  try {
    const { data, error } = await supabase
      .from('eoscar_dispute_details')
      .select('*')
      .eq('control_number', controlNumber)
      .limit(1);
    
    if (error) {
      logger.error(`Error getting dispute by control number: ${error.message}`);
      throw error;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    logger.error(`Error in getDisputeByControlNumber: ${error.message}`, { stack: error.stack });
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
    const { data, error } = await supabase
      .from('eoscar_dispute_details')
      .select('*')
      .eq('client_name', clientName)
      .eq('dispute_status', 'Pending')
      .order('response_due_date', { ascending: true });
    
    if (error) {
      logger.error(`Error retrieving disputes: ${error.message}`);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    logger.error(`Error in getPendingDisputes: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Update a dispute
 * @param {Object} disputeData - Dispute data to update
 * @returns {Promise<Object>} - Updated dispute
 */
async function updateDispute(disputeData) {
  try {
    if (!disputeData.id) {
      throw new Error('Dispute ID is required for updates');
    }
    
    const { data, error } = await supabase
      .from('eoscar_dispute_details')
      .update(disputeData)
      .eq('id', disputeData.id)
      .select();
    
    if (error) {
      logger.error(`Error updating dispute: ${error.message}`);
      throw error;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    logger.error(`Error in updateDispute: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Log a dispute action
 * @param {Object} logData - Log data
 * @returns {Promise<void>}
 */
async function logDisputeAction(logData) {
  try {
    if (!logData.dispute_id || !logData.action_type) {
      throw new Error('Dispute ID and action type are required for logging');
    }
    
    const { error } = await supabase
      .rpc('log_dispute_action', {
        p_dispute_id: logData.dispute_id,
        p_action_type: logData.action_type,
        p_action_details: logData.action_details || {}
      });
    
    if (error) {
      logger.error(`Error logging dispute action: ${error.message}`);
      throw error;
    }
  } catch (error) {
    logger.error(`Error in logDisputeAction: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Get recent audit logs
 * @param {number} limit - Number of logs to retrieve
 * @returns {Promise<Array>} - Array of audit logs
 */
async function getRecentAuditLogs(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('eoscar_audit_log')
      .select(`
        id,
        action_type,
        action_details,
        performed_by,
        created_at,
        eoscar_credentials (username, client_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      logger.error(`Error retrieving audit logs: ${error.message}`);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    logger.error(`Error in getRecentAuditLogs: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

module.exports = {
  supabase,
  getDisputeByControlNumber,
  getPendingDisputes,
  updateDispute,
  logDisputeAction,
  getRecentAuditLogs
};