const logger = require('../../services/logger');
const clickupService = require('../../services/clickup');
const constants = require('../../config/constants');

/**
 * Create ClickUp tasks for disputes
 * @param {Array} disputes - Array of dispute objects
 * @returns {Promise<Array>} - Array of created tasks
 */
async function createDisputeTasks(disputes) {
  logger.info(`Creating ClickUp tasks for ${disputes.length} disputes`);
  
  if (!process.env.CLICKUP_API_TOKEN || !process.env.CLICKUP_LIST_ID) {
    throw new Error('ClickUp API token and list ID are required');
  }
  
  const createdTasks = [];
  
  for (const dispute of disputes) {
    try {
      // Format task name
      const taskName = `${dispute.client_name}: ${dispute.first_name} ${dispute.last_name} (${dispute.control_number})`;
      
      // Format task description
      const description = `
## Dispute Details

- **Control Number**: ${dispute.control_number}
- **Client**: ${dispute.client_name}
- **Account**: ${dispute.date_furnisher}
- **Date Received**: ${dispute.date_received}
- **Response Due Date**: ${dispute.response_due_date}
- **Customer**: ${dispute.first_name} ${dispute.last_name}

Please review this dispute in E-Oscar and determine if it is frivolous or not.
      `.trim();
      
      // Create task
      const task = await clickupService.createTask({
        name: taskName,
        description,
        due_date: dispute.response_due_date ? new Date(dispute.response_due_date).getTime() : null,
        tags: [dispute.client_name, 'dispute']
      });
      
      createdTasks.push({
        dispute_id: dispute.id,
        control_number: dispute.control_number,
        client_name: dispute.client_name,
        task_id: task.id,
        task_url: task.url
      });
      
      logger.info(`Created ClickUp task for dispute ${dispute.control_number}`);
    } catch (error) {
      logger.error(`Error creating ClickUp task for dispute ${dispute.control_number}: ${error.message}`, { stack: error.stack });
    }
  }
  
  logger.info(`Created ${createdTasks.length} ClickUp tasks`);
  return createdTasks;
}

/**
 * Get ClickUp tasks for a list
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of tasks
 */
async function getDisputeTasks(options = {}) {
  logger.info('Getting dispute tasks from ClickUp');
  
  try {
    const tasks = await clickupService.getTasks(options);
    logger.info(`Retrieved ${tasks.length} tasks from ClickUp`);
    return tasks;
  } catch (error) {
    logger.error(`Error getting dispute tasks from ClickUp: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Update ClickUp task with dispute information
 * @param {Object} dispute - Dispute object
 * @param {Object} task - Task object
 * @returns {Promise<Object>} - Updated task
 */
async function updateDisputeTask(dispute, task) {
  logger.info(`Updating ClickUp task for dispute ${dispute.control_number}`);
  
  try {
    // Update the task
    const updatedTask = await clickupService.updateTaskStatus(
      task.id,
      dispute.is_frivolous ? constants.CLICKUP_STATUSES.CLOSED : constants.CLICKUP_STATUSES.NEED_TO_ESCALATE
    );
    
    // Add a comment
    let commentText;
    if (dispute.is_frivolous) {
      commentText = 'This dispute has been categorized as FRIVOLOUS and has been closed in E-Oscar.';
    } else {
      commentText = `This dispute has been categorized as NOT FRIVOLOUS.\n\nIndicator: ${dispute.resolution_details.indicatorDetails}`;
    }
    
    await clickupService.createComment(task.id, commentText);
    
    logger.info(`Successfully updated ClickUp task for dispute ${dispute.control_number}`);
    
    return updatedTask;
  } catch (error) {
    logger.error(`Error updating ClickUp task for dispute ${dispute.control_number}: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

module.exports = {
  createDisputeTasks,
  getDisputeTasks,
  updateDisputeTask
};
