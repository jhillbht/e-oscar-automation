const { google } = require('googleapis');
const { logger } = require('../utils/logger');

/**
 * Google Sheets service for interacting with dispute data
 */
class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initialized = false;
    
    // Configuration
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '1XrGspfqOI3mlkO-d_MIZYiEyyDHpZjaBqRWXlF6pIQU';
    this.importsSheet = process.env.GOOGLE_SHEETS_TAB_IMPORTS || 'ClickUp Imports';
    this.credentialsSheet = process.env.GOOGLE_SHEETS_TAB_CREDENTIALS || 'Login Credentials';
  }
  
  /**
   * Initialize the Google Sheets API client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      // Load service account credentials
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      this.auth = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.initialized = true;
      
      logger.info('Google Sheets API initialized successfully');
    } catch (error) {
      logger.error('Error initializing Google Sheets API:', error);
      throw error;
    }
  }
  
  /**
   * Get all credentials from the credentials sheet
   * @returns {Promise<Array>} - Array of credential objects
   */
  async getCredentials() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      logger.info('Fetching credentials from Google Sheets');
      
      // Get sheet data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.credentialsSheet}!A:C`
      });
      
      const rows = response.data.values || [];
      
      if (rows.length < 2) {
        logger.warn('No credentials found in spreadsheet');
        return [];
      }
      
      // First row is headers
      const headers = rows[0];
      const dataRows = rows.slice(1);
      
      // Map rows to credential objects
      const credentials = dataRows.map(row => {
        const clientName = row[0] || '';
        const username = row[1] || '';
        const password = row[2] || '';
        
        return { clientName, username, password };
      });
      
      logger.info(`Found ${credentials.length} credentials`);
      return credentials;
    } catch (error) {
      logger.error('Error getting credentials from Google Sheets:', error);
      throw error;
    }
  }
  
  /**
   * Upload disputes to the imports sheet
   * @param {Array} disputes - Array of dispute objects
   * @returns {Promise<void>}
   */
  async uploadDisputes(disputes) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!disputes || disputes.length === 0) {
      logger.warn('No disputes to upload');
      return;
    }
    
    try {
      logger.info(`Uploading ${disputes.length} disputes to Google Sheets`);
      
      // First, clear existing data (except header row)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${this.importsSheet}!A2:Z`
      });
      
      // Prepare data rows
      const rows = disputes.map(dispute => [
        dispute.control_number,
        dispute.date_furnished || '',
        dispute.date_received || '',
        dispute.response_due_date || '',
        dispute.first_name || '',
        dispute.last_name || '',
        dispute.dispute_status || 'Pending'
      ]);
      
      // Upload data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.importsSheet}!A2:G${2 + rows.length - 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });
      
      logger.info('Disputes uploaded successfully');
    } catch (error) {
      logger.error('Error uploading disputes to Google Sheets:', error);
      throw error;
    }
  }
  
  /**
   * Update dispute status in the imports sheet
   * @param {string} controlNumber - Control number
   * @param {string} status - New status
   * @returns {Promise<boolean>} - Success status
   */
  async updateDisputeStatus(controlNumber, status) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      logger.info(`Updating status for dispute ${controlNumber} to ${status}`);
      
      // Get all data from the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.importsSheet}!A:G`
      });
      
      const rows = response.data.values || [];
      
      if (rows.length < 2) {
        logger.warn('No data found in spreadsheet');
        return false;
      }
      
      // Find the row with matching control number
      let rowIndex = -1;
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === controlNumber) {
          rowIndex = i + 1; // +1 because sheets are 1-indexed
          break;
        }
      }
      
      if (rowIndex === -1) {
        logger.warn(`Dispute ${controlNumber} not found in spreadsheet`);
        return false;
      }
      
      // Update status column (G)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.importsSheet}!G${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[status]]
        }
      });
      
      logger.info(`Status updated for dispute ${controlNumber}`);
      return true;
    } catch (error) {
      logger.error(`Error updating status for dispute ${controlNumber}:`, error);
      return false;
    }
  }
}

// Export singleton instance
exports.googleSheetsService = new GoogleSheetsService();