const path = require('path');
const fs = require('fs');
const os = require('os');
const logger = require('../../services/logger');
const { loginToEOscar } = require('../auth/login');
const { getClientCredentials, getAllClients } = require('../auth/credentials');
const constants = require('../../config/constants');

/**
 * Download reports from E-Oscar for all or a specific client
 * @param {string} clientName - Client name (optional)
 * @param {Object} dateRange - Date range object with startDate and endDate
 * @returns {Promise<Array>} - Array of downloaded report paths
 */
async function downloadReports(clientName, dateRange) {
  const clients = clientName 
    ? [await getClientCredentials(clientName)]
    : await getAllClients();
  
  logger.info(`Downloading reports for ${clients.length} clients`);
  
  const downloadResults = [];
  
  for (const client of clients) {
    try {
      logger.info(`Processing client: ${client.client_name}`);
      
      // Login to E-Oscar
      const { browser, page } = await loginToEOscar(client);
      
      try {
        // Download the report
        const reportPath = await downloadClientReport(page, client, dateRange);
        downloadResults.push({
          clientName: client.client_name,
          reportPath,
          success: true
        });
      } finally {
        // Close browser
        await browser.close();
      }
    } catch (error) {
      logger.error(`Error downloading report for ${client.client_name}: ${error.message}`, { stack: error.stack });
      downloadResults.push({
        clientName: client.client_name,
        error: error.message,
        success: false
      });
    }
  }
  
  logger.info(`Downloaded ${downloadResults.filter(r => r.success).length} reports successfully`);
  return downloadResults;
}

/**
 * Download a report for a specific client
 * @param {Object} page - Puppeteer page object
 * @param {Object} client - Client credentials
 * @param {Object} dateRange - Date range object with startDate and endDate
 * @returns {Promise<string>} - Path to downloaded report
 */
async function downloadClientReport(page, client, dateRange) {
  const { startDate, endDate } = dateRange;
  logger.info(`Downloading report for ${client.client_name} from ${startDate} to ${endDate}`);
  
  try {
    // Navigate to activity report page
    await page.goto(`${process.env.EOSCAR_URL}/oscar/reports/activityReport`, { 
      waitUntil: 'networkidle0',
      timeout: constants.TIMEOUTS.NAVIGATION 
    });
    
    // Wait for the form to load
    await page.waitForSelector('select[name="caseType"]', { timeout: constants.TIMEOUTS.ELEMENT });
    
    // Set report parameters
    await page.select('select[name="caseType"]', constants.ACTIVITY_REPORT_PARAMS.CASE_TYPE);
    await page.select('select[name="reoccurrence"]', constants.ACTIVITY_REPORT_PARAMS.REOCCURRENCE);
    await page.select('select[name="filterReportBy"]', constants.ACTIVITY_REPORT_PARAMS.FILTER_BY);
    
    // Enter date range
    await page.type('input[name="startDate"]', startDate);
    await page.type('input[name="endDate"]', endDate);
    
    // Set up download path
    const downloadPath = path.join(os.tmpdir(), `e-oscar-report-${client.client_name}-${startDate}-${endDate}.csv`);
    
    // Set up download behavior
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: path.dirname(downloadPath)
    });
    
    // Click Generate Extract button
    await Promise.all([
      page.waitForSelector('button:contains("Extract"), button:contains("Generate"), button.extract-button', { 
        timeout: constants.TIMEOUTS.ELEMENT 
      }),
      page.click('button:contains("Extract"), button:contains("Generate"), button.extract-button')
    ]);
    
    // Wait for download to complete
    await waitForDownload(downloadPath, constants.TIMEOUTS.DOWNLOAD);
    
    logger.info(`Successfully downloaded report for ${client.client_name}`);
    return downloadPath;
  } catch (error) {
    logger.error(`Error downloading report for ${client.client_name}: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Wait for a file to be downloaded
 * @param {string} filePath - Path to the file
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if download completed
 */
function waitForDownload(filePath, timeout) {
  return new Promise((resolve, reject) => {
    const checkInterval = 500; // Check every 500ms
    const maxTime = timeout || 60000; // Default 1 minute timeout
    let elapsed = 0;
    
    const timer = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(timer);
        resolve(true);
        return;
      }
      
      elapsed += checkInterval;
      if (elapsed >= maxTime) {
        clearInterval(timer);
        reject(new Error(`Download timeout after ${maxTime}ms`));
      }
    }, checkInterval);
  });
}

module.exports = {
  downloadReports,
  downloadClientReport
};
