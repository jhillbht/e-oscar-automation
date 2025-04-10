const fetch = require('node-fetch');
const { logger } = require('../utils/logger');

/**
 * ClickUp service for task management
 */
class ClickUpService {
  constructor() {
    this.apiToken = process.env.CLICKUP_API_TOKEN;
    this.baseUrl = 'https://api.clickup.com/api/v2';
  }
  
  /**
   * Make API request to ClickUp
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - API response
   */
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers = {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json'
      };
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...headers
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickUp API error (${response.status}): ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error(`Error in ClickUp API request (${endpoint}):`, error);
      throw error;
    }
  }
  
  /**
   * Find task by name (control number)
   * @param {string} controlNumber - Dispute control number
   * @returns {Promise<Object|null>} - Task data or null if not found
   */
  async findTaskByControlNumber(controlNumber) {
    try {
      // Use the search endpoint to find the task
      const listId = process.env.CLICKUP_LIST_ID;
      
      if (!listId) {
        throw new Error('ClickUp list ID not configured');
      }
      
      // First try to search in the list
      const searchResponse = await this.request(`/list/${listId}/task?includes_closed=true&order_by=created`);
      
      if (!searchResponse || !searchResponse.tasks) {
        return null;
      }
      
      // Find task that contains the control number in name
      const task = searchResponse.tasks.find(task => 
        task.name.includes(controlNumber)
      );
      
      return task || null;
    } catch (error) {
      logger.error(`Error finding task for control number ${controlNumber}:`, error);
      return null;
    }
  }
  
  /**
   * Close a frivolous dispute task
   * @param {string} controlNumber - Dispute control number
   * @returns {Promise<boolean>} - Success status
   */
  async closeFrivolousDispute(controlNumber) {
    try {
      // Find the task first
      const task = await this.findTaskByControlNumber(controlNumber);
      
      if (!task) {
        logger.warn(`Task for control number ${controlNumber} not found`);
        return false;
      }
      
      // Add comment
      await this.request(`/task/${task.id}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          comment_text: `Dispute categorized as FRIVOLOUS and has been closed in E-Oscar.`
        })
      });
      
      // Update status to closed
      await this.request(`/task/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'closed'
        })
      });
      
      logger.info(`Successfully closed ClickUp task for ${controlNumber}`);
      return true;
    } catch (error) {
      logger.error(`Error closing task for control number ${controlNumber}:`, error);
      return false;
    }
  }
  
  /**
   * Escalate a non-frivolous dispute task
   * @param {string} controlNumber - Dispute control number
   * @param {string} indicatorDetails - Non-frivolous indicator details
   * @returns {Promise<boolean>} - Success status
   */
  async escalateNonFrivolousDispute(controlNumber, indicatorDetails) {
    try {
      // Find the task first
      const task = await this.findTaskByControlNumber(controlNumber);
      
      if (!task) {
        logger.warn(`Task for control number ${controlNumber} not found`);
        return false;
      }
      
      // Add comment with indicator details
      await this.request(`/task/${task.id}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          comment_text: `Dispute categorized as NOT FRIVOLOUS. Indicator details:\n\n${indicatorDetails}`
        })
      });
      
      // Update status to NEED TO ESCALATE
      await this.request(`/task/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'NEED TO ESCALATE'
        })
      });
      
      logger.info(`Successfully escalated ClickUp task for ${controlNumber}`);
      return true;
    } catch (error) {
      logger.error(`Error escalating task for control number ${controlNumber}:`, error);
      return false;
    }
  }
}

// Export singleton instance
exports.clickupService = new ClickUpService();