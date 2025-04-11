const { google } = require('googleapis');
const { Readable } = require('stream');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const logger = require('./logger');

// Google Sheets configuration
const DISPUTE_SHEET_ID = process.env.DISPUTE_SHEET_ID;
const DISPUTE_SHEET_TAB = process.env.DISPUTE_SHEET_TAB || 'ClickUp Imports';
const CREDENTIALS_SHEET_TAB = process.env.CREDENTIALS_SHEET_TAB || 'Login Credentials';

// OAuth2 client setup
let auth = null;
let sheets = null;

/**
 * Initialize Google Sheets API client
 * @returns {Promise<void>}
 */
async function initializeSheets() {
  if (sheets) return; // Already initialized
  
  if (!process.env.SHEETS_MCP_KEY) {
    throw new Error('SHEETS_MCP_KEY environment variable is required');
  }
  
  try {
    auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.SHEETS_MCP_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const authClient = await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth: authClient });
    
    logger.info('Google Sheets API client initialized successfully');
  } catch (error) {
    logger.error(`Error initializing Google Sheets API: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Get dispute data from Google Sheets
 * @returns {Promise<Array>} - Array of dispute objects
 */
async function getDisputeData() {
  await initializeSheets();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DISPUTE_SHEET_ID,
      range: `${DISPUTE_SHEET_TAB}!A:Z`,
    });
    
    const rows = response.data.values || [];
    if (rows.length <= 1) {
      logger.warn('No dispute data found in Google Sheets');
      return [];
    }
    
    // Extract header row and data rows
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    // Convert to array of objects
    return dataRows.map(row => {
      const dispute = {};
      headers.forEach((header, index) => {
        dispute[header] = index < row.length ? row[index] : '';
      });
      return dispute;
    });
  } catch (error) {
    logger.error(`Error getting dispute data from Google Sheets: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Parse CSV data from E-Oscar report
 * @param {Buffer|string} csvData - CSV data
 * @returns {Promise<Array>} - Array of parsed objects
 */
function parseCSVReport(csvData) {
  try {
    // Parse CSV
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Clean up control numbers (remove leading "*")
    return records.map(record => {
      const cleanedRecord = { ...record };
      if (cleanedRecord['Control Number'] && cleanedRecord['Control Number'].startsWith('*')) {
        cleanedRecord['Control Number'] = cleanedRecord['Control Number'].substring(1);
      }
      return cleanedRecord;
    });
  } catch (error) {
    logger.error(`Error parsing CSV report: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Update Google Sheets with dispute data
 * @param {Array} disputes - Array of dispute objects
 * @returns {Promise<Object>} - Response from Google Sheets API
 */
async function updateDisputeSheet(disputes) {
  await initializeSheets();
  
  try {
    if (!disputes || disputes.length === 0) {
      logger.warn('No dispute data to update');
      return null;
    }
    
    // Get existing data to determine what's new
    const existingData = await getDisputeData();
    const existingControlNumbers = new Set(
      existingData.map(dispute => dispute['Control Number'])
    );
    
    // Filter out disputes that already exist
    const newDisputes = disputes.filter(
      dispute => !existingControlNumbers.has(dispute['Control Number'])
    );
    
    if (newDisputes.length === 0) {
      logger.info('No new disputes to add to Google Sheets');
      return null;
    }
    
    // Define the relevant columns in order
    const relevantColumns = [
      'Control Number',
      'Date Furnisher (Account)',
      'Date Received',
      'Response Due Date',
      'First Name',
      'Last Name'
    ];
    
    // Prepare data for appending
    const values = newDisputes.map(dispute => {
      return relevantColumns.map(column => dispute[column] || '');
    });
    
    // Append data to the sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: DISPUTE_SHEET_ID,
      range: `${DISPUTE_SHEET_TAB}!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values
      },
    });
    
    logger.info(`Added ${newDisputes.length} new disputes to Google Sheets`);
    return response.data;
  } catch (error) {
    logger.error(`Error updating dispute sheet: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Get credentials from Google Sheets
 * @returns {Promise<Array>} - Array of credential objects
 */
async function getCredentials() {
  await initializeSheets();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: DISPUTE_SHEET_ID,
      range: `${CREDENTIALS_SHEET_TAB}!A:Z`,
    });
    
    const rows = response.data.values || [];
    if (rows.length <= 1) {
      logger.warn('No credentials found in Google Sheets');
      return [];
    }
    
    // Extract header row and data rows
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    // Convert to array of objects
    const credentials = dataRows.map(row => {
      const credential = {};
      headers.forEach((header, index) => {
        credential[header] = index < row.length ? row[index] : '';
      });
      return credential;
    });
    
    return credentials.filter(cred => cred.Username && cred.Password);
  } catch (error) {
    logger.error(`Error getting credentials from Google Sheets: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

module.exports = {
  initializeSheets,
  getDisputeData,
  parseCSVReport,
  updateDisputeSheet,
  getCredentials
};
