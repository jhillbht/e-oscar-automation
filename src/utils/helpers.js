const fs = require('fs');
const path = require('path');

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get yesterday's date
 * @returns {Date} - Yesterday's date
 */
function getYesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

/**
 * Get last Friday's date if today is Monday, or yesterday's date otherwise
 * @returns {Date} - Start date
 */
function getStartDate() {
  const today = new Date();
  const isMonday = today.getDay() === 1;
  
  if (isMonday) {
    // If Monday, start from Friday (3 days ago)
    const friday = new Date(today);
    friday.setDate(today.getDate() - 3);
    return friday;
  } else {
    // Otherwise, start from yesterday
    return getYesterday();
  }
}

/**
 * Ensure a directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get date range for reports
 * @returns {Object} - Object with startDate and endDate
 */
function getDateRange() {
  const today = new Date();
  const isMonday = today.getDay() === 1;
  
  let startDate, endDate;
  if (isMonday) {
    // If Monday, start from Friday
    const friday = new Date(today);
    friday.setDate(today.getDate() - 3);
    startDate = formatDate(friday);
  } else {
    // Otherwise, start from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    startDate = formatDate(yesterday);
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  endDate = formatDate(yesterday);
  
  return { startDate, endDate };
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if CSV contains expected columns
 * @param {Array} headers - CSV headers
 * @param {Array} requiredColumns - Required columns
 * @returns {boolean} - True if all required columns are present
 */
function validateCSVHeaders(headers, requiredColumns) {
  return requiredColumns.every(column => headers.includes(column));
}

module.exports = {
  formatDate,
  getYesterday,
  getStartDate,
  ensureDirectoryExists,
  getDateRange,
  sleep,
  validateCSVHeaders
};
