const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

/**
 * Handler for updateStatus function
 * @param {Object} data - Function data
 * @param {Object} context - Function context
 * @returns {Promise<Object>} - Status update result
 */
exports.updateStatusHandler = async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new Error('Unauthorized');
  }
  
  const userId = context.auth.uid;
  const { status, progress, message, log } = data;
  
  try {
    // Create status update
    const statusUpdate = {
      user_id: userId,
      status,
      progress,
      message,
      log,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add to automation_status collection
    await admin.firestore().collection('automation_status').add(statusUpdate);
    
    return {
      success: true,
      status: 'Status updated successfully'
    };
  } catch (error) {
    logger.error('Error updating status:', error);
    throw new Error(`Status update failed: ${error.message}`);
  }
};