/**
 * Scheduler Utility for the E-Oscar Dispute Review Automation
 * Handles scheduled execution of automation tasks
 */

const cron = require('node-cron');
const logger = require('../services/logger');

/**
 * Set up a schedule for the automation
 * @param {Function} jobFunction - Function to execute on schedule
 * @returns {cron.ScheduledTask} - Scheduled task object
 */
function setupSchedule(jobFunction) {
  const cronExpression = process.env.CRON_SCHEDULE || '0 8 * * 1-5'; // Default: 8:00 AM, Monday-Friday
  
  logger.info(`Setting up scheduled job with expression: ${cronExpression}`);
  
  const task = cron.schedule(cronExpression, async () => {
    logger.info('Starting scheduled execution');
    
    try {
      // Check if it's Monday to include weekend data
      const isMonday = new Date().getDay() === 1;
      
      // Pass isWeekend flag if it's Monday
      if (isMonday) {
        logger.info('Running Monday job with weekend processing');
        await jobFunction(true);
      } else {
        logger.info('Running regular daily job');
        await jobFunction(false);
      }
      
      logger.info('Scheduled job completed successfully');
    } catch (error) {
      logger.error('Error in scheduled job:', error);
    }
  }, {
    scheduled: true,
    timezone: process.env.TIMEZONE || 'America/New_York'
  });
  
  logger.info('Scheduled job has been set up successfully');
  return task;
}

/**
 * Get date range for report extraction
 * @param {boolean} isWeekend - Whether to include weekend dates
 * @returns {Object} - Object with startDate and endDate
 */
function getDateRange(isWeekend = false) {
  const today = new Date();
  let startDate, endDate;
  
  // Set end date to yesterday
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  endDate = formatDate(yesterday);
  
  if (isWeekend) {
    // If including weekend, start from Friday (if today is Monday)
    const friday = new Date(today);
    friday.setDate(today.getDate() - 3);
    startDate = formatDate(friday);
  } else {
    // Otherwise, start from yesterday
    startDate = endDate;
  }
  
  return { startDate, endDate };
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  setupSchedule,
  getDateRange,
  formatDate
};