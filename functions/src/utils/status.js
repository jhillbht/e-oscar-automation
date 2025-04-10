const admin = require('firebase-admin');
const { logger } = require('./logger');

/**
 * Update automation status
 * @param {Object} options - Status update options
 * @param {string} options.userId - User ID
 * @param {string} options.status - Status (running, complete, error)
 * @param {number} options.progress - Progress percentage (0-100)
 * @param {string} [options.message] - Status message
 * @param {string} [options.log] - Log message
 * @returns {Promise<void>}
 */
async function updateStatus({ userId, status, progress, message, log }) {
  try {
    // Create status update
    const statusUpdate = {
      user_id: userId || 'system',
      status,
      progress,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (message) {
      statusUpdate.message = message;
    }
    
    if (log) {
      statusUpdate.log = log;
      logger.info(log);
    }
    
    // Add to automation_status collection
    await admin.firestore().collection('automation_status').add(statusUpdate);
  } catch (error) {
    logger.error('Error updating status:', error);
  }
}

module.exports = {
  updateStatus
};