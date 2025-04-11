/**
 * E-Oscar report downloader module
 * Downloads activity reports for each client
 */

const path = require('path');
const fs = require('fs');
const { loginToEOscar } = require('../auth/login');
const logger = require('../../services/logger');
const { saveDisputes } = require('../../services/supabase');
const { processReportData } = require('./processor');

// Ensure download directory exists
const downloadDir = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

/**
 * Download reports for all clients
 * @param {Array} clients - Array of client objects with credentials
 * @returns {Promise<Array>} - Array of download results
 */
async function downloadReports(clients) {
  logger.info(`Starting report downloads for ${clients.length} clients`);
  
  const results = [];
  
  for (const client of clients) {
    try {
      logger.info(`Processing client: ${client.client_name}`);
      const result = await downloadClientReport(client);
      results.push(result);
    } catch (error) {
      logger.error(`Error processing client ${client.client_name}:`, error);
      results.push({
        client: client.client_name,
        success: false,
        error: error.message
      });
    }
  }
  
  logger.info(`Completed report downloads for ${clients.length} clients`);
  return results;
}

/**
 * Download report for a single client
 * @param {Object} client - Client object with credentials
 * @returns {Promise<Object>} - Download result
 */
async function downloadClientReport(client) {
  logger.info(`Downloading report for client: ${client.client_name}`);
  
  let browser, page;
  try {
    // Login to E-Oscar
    ({ browser, page } = await loginToEOscar(client));
    
    // Navigate to activity report page
    await page.goto('https://www.e-oscar-web.net/oscar/activityReport/');
    await page.waitForSelector('#activityReportForm');
    
    // Configure activity report filters
    // 1. Select Case Type: ACDV
    await page.select('select[name="caseType"]', 'ACDV');
    
    // 2. Select Reoccurrence: Ad Hoc
    await page.select('select[name="reoccurrence"]', 'ADHOC');
    
    // 3. Select Filter Report By: Date Received
    await page.select('select[name="activityReportFilterBy"]', 'dateReceived');
    
    // 4. Determine date range
    const { startDate, endDate } = getDateRange();
    
    // 5. Set Start Date
    await page.type('input[name="startDate"]', startDate);
    
    // 6. Set End Date
    await page.type('input[name="endDate"]', endDate);
    
    // 7. Click Generate Extract button
    const [downloadResponse] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('activityReport/generateExtract') && 
        response.status() === 200
      ),
      page.click('button[type="submit"]')
    ]);
    
    // 8. Download the report
    const reportData = await downloadResponse.buffer();
    
    // 9. Save the report to file
    const fileName = `${client.client_name}_${startDate}_${endDate}.csv`;
    const filePath = path.join(downloadDir, fileName);
    fs.writeFileSync(filePath, reportData);
    logger.info(`Saved report to ${filePath}`);
    
    // 10. Process the report data
    const disputes = await processReportData(reportData, client.client_name);
    logger.info(`Processed ${disputes.length} disputes for client ${client.client_name}`);
    
    // 11. Save disputes to database
    if (disputes.length > 0) {
      const savedDisputes = await saveDisputes(disputes);
      logger.info(`Saved ${savedDisputes.length} disputes to database for client ${client.client_name}`);
    }
    
    // Close browser
    await browser.close();
    
    return {
      client: client.client_name,
      success: true,
      filePath,
      disputeCount: disputes.length
    };
  } catch (error) {
    logger.error(`Error downloading report for client ${client.client_name}:`, error);
    
    // Close browser if it exists
    if (browser) {
      await browser.close();
    }
    
    throw error;
  }
}

/**
 * Get date range for activity report
 * @returns {Object} - Start and end dates
 */
function getDateRange() {
  const today = new Date();
  const isMonday = today.getDay() === 1;
  
  let startDate, endDate;
  
  // If today is Monday, include weekend (Friday - Sunday)
  if (isMonday) {
    const friday = new Date(today);
    friday.setDate(today.getDate() - 3);
    startDate = formatDate(friday);
  } else {
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
 * Format date as MM/DD/YYYY
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

module.exports = {
  downloadReports,
  downloadClientReport,
  getDateRange
};
