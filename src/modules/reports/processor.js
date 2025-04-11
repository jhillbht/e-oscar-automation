/**
 * E-Oscar report processor module
 * Processes downloaded reports and extracts dispute data
 */

const { google } = require('googleapis');
const logger = require('../../services/logger');

/**
 * Process report data from CSV buffer
 * @param {Buffer} reportData - Report data as buffer
 * @param {string} clientName - Client name
 * @returns {Promise<Array>} - Array of dispute objects
 */
async function processReportData(reportData, clientName) {
  logger.info(`Processing report data for client: ${clientName}`);
  
  try {
    // Convert buffer to string
    const csvContent = reportData.toString('utf8');
    
    // Parse CSV data
    const disputes = parseCSV(csvContent, clientName);
    logger.info(`Parsed ${disputes.length} disputes from CSV`);
    
    // Update Google Sheet if configured
    if (process.env.SHEETS_MCP_KEY && process.env.DISPUTE_SHEET_ID) {
      await updateGoogleSheet(disputes);
      logger.info(`Updated Google Sheet with ${disputes.length} disputes`);
    }
    
    return disputes;
  } catch (error) {
    logger.error(`Error processing report data for client ${clientName}:`, error);
    throw error;
  }
}

/**
 * Parse CSV content and extract dispute data
 * @param {string} csvContent - CSV content as string
 * @param {string} clientName - Client name
 * @returns {Array} - Array of dispute objects
 */
function parseCSV(csvContent, clientName) {
  // Split CSV by lines
  const lines = csvContent.split(/\\r?\\n/);
  
  // Find header line
  const headerLine = lines.find(line => line.includes('Control Number') && line.includes('Date Received'));
  if (!headerLine) {
    logger.warn(`CSV header not found for client ${clientName}`);
    return [];
  }
  
  // Parse header columns
  const headers = headerLine.split(',').map(header => header.trim());
  
  // Find column indices
  const controlNumberIndex = headers.findIndex(header => header.includes('Control Number'));
  const dateFurnisherIndex = headers.findIndex(header => header.includes('Date Furnisher') || header.includes('Account'));
  const dateReceivedIndex = headers.findIndex(header => header.includes('Date Received'));
  const responseDueDateIndex = headers.findIndex(header => header.includes('Response Due Date'));
  const firstNameIndex = headers.findIndex(header => header.includes('First Name'));
  const lastNameIndex = headers.findIndex(header => header.includes('Last Name'));
  
  // Validate required columns
  if (controlNumberIndex === -1 || dateReceivedIndex === -1 || firstNameIndex === -1 || lastNameIndex === -1) {
    logger.warn(`Required columns not found in CSV for client ${clientName}`);
    return [];
  }
  
  // Find data lines (exclude header and empty lines)
  const dataLines = lines.filter(line => 
    line.trim() !== '' && 
    line !== headerLine && 
    line.includes(',')
  );
  
  // Parse dispute data
  const disputes = dataLines.map(line => {
    const columns = line.split(',').map(col => col.trim());
    
    // Extract control number and remove leading "*" if present
    const controlNumber = columns[controlNumberIndex]?.replace(/^\*/, '') || '';
    
    return {
      client_name: clientName,
      control_number: controlNumber,
      date_furnisher: columns[dateFurnisherIndex] || '',
      date_received: columns[dateReceivedIndex] || '',
      response_due_date: columns[responseDueDateIndex] || '',
      first_name: columns[firstNameIndex] || '',
      last_name: columns[lastNameIndex] || '',
      dispute_status: 'Pending',
      created_at: new Date().toISOString()
    };
  }).filter(dispute => dispute.control_number); // Filter out empty control numbers
  
  return disputes;
}

/**
 * Update Google Sheet with dispute data
 * @param {Array} disputes - Array of dispute objects
 * @returns {Promise<void>}
 */
async function updateGoogleSheet(disputes) {
  logger.info(`Updating Google Sheet with ${disputes.length} disputes`);
  
  try {
    // Set up Google Sheets API
    const sheets = google.sheets({ version: 'v4' });
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.SHEETS_MCP_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const authClient = await auth.getClient();
    google.options({ auth: authClient });
    
    // Prepare data for Google Sheet
    const sheetData = disputes.map(dispute => [
      dispute.control_number,
      dispute.date_furnisher,
      dispute.date_received,
      dispute.response_due_date,
      dispute.first_name,
      dispute.last_name
    ]);
    
    // Update Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.DISPUTE_SHEET_ID,
      range: `${process.env.DISPUTE_SHEET_TAB || 'ClickUp Imports'}!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: sheetData
      }
    });
    
    logger.info('Google Sheet updated successfully');
  } catch (error) {
    logger.error('Error updating Google Sheet:', error);
    throw error;
  }
}

module.exports = {
  processReportData,
  parseCSV,
  updateGoogleSheet
};
