const axios = require('axios');
const logger = require('./logger');
const constants = require('../config/constants');

// ClickUp API configuration
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID;
const API_BASE_URL = 'https://api.clickup.com/api/v2';

// Create axios instance with auth header
let clickupClient;
if (CLICKUP_API_TOKEN && CLICKUP_API_TOKEN !== 'test-api-token') {
  clickupClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': CLICKUP_API_TOKEN,
      'Content-Type': 'application/json'
    },
    timeout: constants.TIMEOUTS.REQUEST
  });
} else {
  logger.warn('CLICKUP_API_TOKEN not provided or is test token. ClickUp integration will be simulated.');
}

/**
 * Get a specific task by ID
 * @param {string} taskId - ClickUp task ID
 * @returns {Promise<Object>} - Task object
 */
async function getTask(taskId) {
  // Handle debug mode
  if (process.env.DEBUG_MODE === 'true') {
    logger.info(`DEBUG MODE: Would get ClickUp task ${taskId}`);
    return {
      id: taskId,
      name: 'Mock Task',
      status: 'Open',
      list: { id: 'mock-list' }
    };
  }

  if (!clickupClient) {
    throw new Error('ClickUp client not initialized');
  }
  
  try {
    const response = await clickupClient.get(`/task/${taskId}`);
    return response.data;
  } catch (error) {
    logger.error(`Error getting task from ClickUp: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Create a comment on a task
 * @param {string} taskId - ClickUp task ID
 * @param {string} comment - Comment text
 * @returns {Promise<Object>} - Comment object
 */
async function createComment(taskId, comment) {
  // Handle debug mode
  if (process.env.DEBUG_MODE === 'true') {
    logger.info(`DEBUG MODE: Would add comment to ClickUp task ${taskId}: "${comment}"`);
    return {
      id: 'mock-comment-id',
      comment_text: comment,
      task_id: taskId
    };
  }

  if (!clickupClient) {
    throw new Error('ClickUp client not initialized');
  }
  
  try {
    const response = await clickupClient.post(`/task/${taskId}/comment`, {
      comment_text: comment
    });
    
    return response.data;
  } catch (error) {
    logger.error(`Error creating comment on ClickUp task: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Update a task's status
 * @param {string} taskId - ClickUp task ID
 * @param {string} status - New status
 * @returns {Promise<Object>} - Updated task object
 */
async function updateTaskStatus(taskId, status) {
  // Handle debug mode
  if (process.env.DEBUG_MODE === 'true') {
    logger.info(`DEBUG MODE: Would update ClickUp task ${taskId} status to "${status}"`);
    return {
      id: taskId,
      name: 'Mock Task',
      status: status
    };
  }

  if (!clickupClient) {
    throw new Error('ClickUp client not initialized');
  }
  
  try {
    const response = await clickupClient.put(`/task/${taskId}`, {
      status: status
    });
    
    return response.data;
  } catch (error) {
    logger.error(`Error updating ClickUp task status: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Process a non-frivolous dispute
 * @param {Object} dispute - Dispute object
 * @param {string} indicatorDetails - Indicator details
 * @returns {Promise<Object>} - Updated dispute object
 */
async function processNonFrivolousDispute(dispute, indicatorDetails) {
  try {
    if (!dispute.clickup_task_id) {
      logger.warn(`No ClickUp task ID found for dispute ${dispute.control_number}`);
      return dispute;
    }
    
    logger.info(`Processing non-frivolous dispute in ClickUp: ${dispute.control_number}`);
    
    // 1. Add comment with indicator details
    const commentText = `This dispute has been categorized as NOT FRIVOLOUS.\n\nIndicator: ${indicatorDetails}`;
    await createComment(dispute.clickup_task_id, commentText);
    
    // 2. Update task status to NEED TO ESCALATE
    await updateTaskStatus(dispute.clickup_task_id, constants.CLICKUP_STATUSES.NEED_TO_ESCALATE);
    
    logger.info(`Successfully processed non-frivolous dispute in ClickUp: ${dispute.control_number}`);
    
    return {
      ...dispute,
      dispute_status: 'Escalated',
      is_frivolous: false,
      resolution_details: {
        indicatorDetails,
        clickupComment: commentText,
        clickupStatus: constants.CLICKUP_STATUSES.NEED_TO_ESCALATE
      }
    };
  } catch (error) {
    logger.error(`Error processing non-frivolous dispute in ClickUp: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Process a frivolous dispute
 * @param {Object} dispute - Dispute object
 * @returns {Promise<Object>} - Updated dispute object
 */
async function processFrivolousDispute(dispute) {
  try {
    if (!dispute.clickup_task_id) {
      logger.warn(`No ClickUp task ID found for dispute ${dispute.control_number}`);
      return dispute;
    }
    
    logger.info(`Processing frivolous dispute in ClickUp: ${dispute.control_number}`);
    
    // 1. Add comment
    const commentText = `This dispute has been categorized as FRIVOLOUS and has been closed in E-Oscar.`;
    await createComment(dispute.clickup_task_id, commentText);
    
    // 2. Update task status to CLOSED
    await updateTaskStatus(dispute.clickup_task_id, constants.CLICKUP_STATUSES.CLOSED);
    
    logger.info(`Successfully processed frivolous dispute in ClickUp: ${dispute.control_number}`);
    
    return {
      ...dispute,
      dispute_status: 'Closed',
      is_frivolous: true,
      resolution_details: {
        clickupComment: commentText,
        clickupStatus: constants.CLICKUP_STATUSES.CLOSED
      }
    };
  } catch (error) {
    logger.error(`Error processing frivolous dispute in ClickUp: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

module.exports = {
  getTask,
  createComment,
  updateTaskStatus,
  processNonFrivolousDispute,
  processFrivolousDispute
};
