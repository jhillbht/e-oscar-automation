const puppeteer = require('puppeteer');
const { getOTP } = require('./slack');
const { logger } = require('../utils/logger');

/**
 * E-Oscar service for browser automation
 */
class EOscarService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.initialized = false;
    this.baseUrl = 'https://www.e-oscar-web.net/';
  }
  
  /**
   * Initialize the browser
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewport({ width: 1280, height: 800 });
      
      // Set timeouts
      await this.page.setDefaultNavigationTimeout(60000); // 60 seconds
      await this.page.setDefaultTimeout(30000); // 30 seconds
      
      this.initialized = true;
      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Error initializing browser:', error);
      throw error;
    }
  }
  
  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.initialized = false;
      logger.info('Browser closed and resources cleaned up');
    }
  }
  
  /**
   * Login to E-Oscar
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<void>}
   */
  async login(username, password) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      logger.info(`Logging in as ${username}`);
      
      // Navigate to login page
      await this.page.goto(this.baseUrl);
      
      // Enter username and password
      await this.page.waitForSelector('#j_username');
      await this.page.type('#j_username', username);
      await this.page.type('#j_password', password);
      
      // Click login button
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click('input[type="submit"]')
      ]);
      
      // Check if OTP is required
      const otpRequired = await this.page.evaluate(() => {
        return !!document.querySelector('#oneTimePassword');
      });
      
      if (otpRequired) {
        logger.info('OTP required, retrieving from Slack');
        
        // Wait for OTP input field
        await this.page.waitForSelector('#oneTimePassword');
        
        // Get OTP from Slack
        const otp = await getOTP();
        
        if (!otp) {
          throw new Error('Failed to retrieve OTP from Slack');
        }
        
        logger.info('OTP retrieved, entering OTP');
        
        // Enter OTP
        await this.page.type('#oneTimePassword', otp);
        
        // Submit OTP
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
          this.page.click('input[type="submit"]')
        ]);
      }
      
      // Verify successful login
      const loggedIn = await this.page.evaluate(() => {
        return !!document.querySelector('.navbar') || 
               !!document.querySelector('#header') ||
               document.title.includes('Home');
      });
      
      if (!loggedIn) {
        throw new Error('Failed to log in to E-Oscar');
      }
      
      logger.info('Successfully logged in to E-Oscar');
    } catch (error) {
      logger.error('Error during login:', error);
      throw error;
    }
  }
  
  /**
   * Generate activity report
   * @param {Object} options - Report options
   * @param {string} options.startDate - Start date (YYYY-MM-DD)
   * @param {string} options.endDate - End date (YYYY-MM-DD)
   * @param {string} options.clientName - Client name
   * @returns {Promise<Array>} - Extracted report data
   */
  async generateReport({ startDate, endDate, clientName }) {
    if (!this.initialized) {
      throw new Error('Browser not initialized');
    }
    
    try {
      logger.info(`Generating report for ${clientName} from ${startDate} to ${endDate}`);
      
      // Navigate to activity report page
      await this.page.goto(`${this.baseUrl}/oscar/reports/activity`);
      
      // Wait for form to load
      await this.page.waitForSelector('select[name="caseType"]');
      
      // Fill out report form
      await this.page.select('select[name="caseType"]', 'ACDV');
      await this.page.select('select[name="reoccurrence"]', 'Ad Hoc');
      await this.page.select('select[name="filterReportBy"]', 'Date Received');
      
      // Set start date
      await this.page.evaluate((date) => {
        document.querySelector('input[name="startDate"]').value = date;
      }, startDate);
      
      // Set end date
      await this.page.evaluate((date) => {
        document.querySelector('input[name="endDate"]').value = date;
      }, endDate);
      
      // Generate extract
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click('button[type="button"]:has-text("Generate Extract")')
      ]);
      
      // Wait for download to complete
      await this.page.waitForSelector('.download-link, .extract-available');
      
      // Check if extract is empty
      const isEmpty = await this.page.evaluate(() => {
        return document.body.textContent.includes('No data found for the selected criteria');
      });
      
      if (isEmpty) {
        logger.info(`No data found for ${clientName} from ${startDate} to ${endDate}`);
        return [];
      }
      
      // Parse the data from the table
      const reportData = await this.page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('table.data-table th'))
          .map(th => th.textContent.trim());
        
        const rows = Array.from(document.querySelectorAll('table.data-table tbody tr'));
        
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          const rowData = {};
          
          cells.forEach((cell, index) => {
            if (index < headers.length) {
              const key = headers[index].toLowerCase().replace(/\s+/g, '_');
              rowData[key] = cell.textContent.trim();
            }
          });
          
          return rowData;
        });
      });
      
      // Process the report data
      const processedData = reportData.map(row => ({
        control_number: (row.control_number || '').replace(/^\*/, ''), // Remove leading "*"
        date_furnished: row.date_furnished || row.date_furnisher || row.account_date,
        date_received: row.date_received,
        response_due_date: row.response_due_date || row.due_date,
        first_name: row.first_name || row.consumer_first_name,
        last_name: row.last_name || row.consumer_last_name
      }));
      
      logger.info(`Successfully generated report with ${processedData.length} disputes`);
      
      return processedData;
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }
  
  /**
   * Search for a case by control number
   * @param {string} controlNumber - Case control number
   * @returns {Promise<void>}
   */
  async searchCase(controlNumber) {
    if (!this.initialized) {
      throw new Error('Browser not initialized');
    }
    
    try {
      logger.info(`Searching for case: ${controlNumber}`);
      
      // Navigate to case search page
      await this.page.goto(`${this.baseUrl}/oscar/case/search`);
      
      // Wait for search form
      await this.page.waitForSelector('select[name="caseType"]');
      
      // Fill out search form
      await this.page.select('select[name="caseType"]', 'ACDV');
      await this.page.type('input[name="caseNumber"]', controlNumber);
      
      // Submit search
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click('button[type="submit"]')
      ]);
      
      // Check if case was found
      const caseFound = await this.page.evaluate(() => {
        return !!document.querySelector('a.case-id-link') || 
               !!document.querySelector('a[href*="case/view"]');
      });
      
      if (!caseFound) {
        throw new Error(`Case not found for control number: ${controlNumber}`);
      }
      
      // Click on case ID link
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click('a.case-id-link, a[href*="case/view"]')
      ]);
      
      // Wait for case details page to load
      await this.page.waitForSelector('.case-details, #caseDetailsForm');
      
      logger.info(`Successfully opened case: ${controlNumber}`);
    } catch (error) {
      logger.error(`Error searching for case ${controlNumber}:`, error);
      throw error;
    }
  }
  
  /**
   * Categorize a dispute as frivolous or not
   * @returns {Promise<Object>} - Categorization result
   */
  async categorizeDispute() {
    if (!this.initialized) {
      throw new Error('Browser not initialized');
    }
    
    try {
      logger.info('Categorizing dispute');
      
      // Extract relevant fields from the case page
      const caseDetails = await this.page.evaluate(() => {
        // Helper function to get text content
        const getText = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : null;
        };
        
        // Try different selectors based on page structure
        return {
          disputeCode1: getText('#disputeCode1') || getText('.dispute-code-1') || getText('[data-field="disputeCode1"]'),
          disputeCode2: getText('#disputeCode2') || getText('.dispute-code-2') || getText('[data-field="disputeCode2"]'),
          images: getText('#images') || getText('.images') || getText('[data-field="images"]'),
          fcraRelevantInfo: getText('#fcraRelevantInfo') || getText('.fcra-relevant-info') || getText('[data-field="fcraRelevantInfo"]')
        };
      });
      
      logger.info('Case details extracted:', caseDetails);
      
      // Apply categorization rules
      let isFrivolous = true;
      let nonFrivolousReason = null;
      let indicatorDetails = null;
      
      // Rule 1: Dispute Code 1 or 2 contains "103"
      if (
        (caseDetails.disputeCode1 && caseDetails.disputeCode1.includes('103')) ||
        (caseDetails.disputeCode2 && caseDetails.disputeCode2.includes('103'))
      ) {
        isFrivolous = false;
        nonFrivolousReason = 'Dispute code contains 103';
        indicatorDetails = caseDetails.disputeCode1?.includes('103') 
          ? caseDetails.disputeCode1 
          : caseDetails.disputeCode2;
      }
      
      // Rule 2: Images has value other than "--" or "0"
      else if (
        caseDetails.images && 
        caseDetails.images !== '--' && 
        caseDetails.images !== '0'
      ) {
        isFrivolous = false;
        nonFrivolousReason = 'Images has value';
        indicatorDetails = `Images: ${caseDetails.images}`;
      }
      
      // Rule 3: FCRA Relevant Information has value other than "--"
      else if (
        caseDetails.fcraRelevantInfo && 
        caseDetails.fcraRelevantInfo !== '--'
      ) {
        isFrivolous = false;
        nonFrivolousReason = 'FCRA Relevant Information has value';
        indicatorDetails = `FCRA Relevant Information: ${caseDetails.fcraRelevantInfo}`;
      }
      
      // Log result
      logger.info(`Dispute categorized as ${isFrivolous ? 'FRIVOLOUS' : 'NOT FRIVOLOUS'}`);
      if (!isFrivolous) {
        logger.info(`Reason: ${nonFrivolousReason}`);
        logger.info(`Indicator details: ${indicatorDetails}`);
      }
      
      return {
        isFrivolous,
        nonFrivolousReason,
        indicatorDetails,
        caseDetails
      };
    } catch (error) {
      logger.error('Error categorizing dispute:', error);
      throw error;
    }
  }
  
  /**
   * Handle a frivolous case
   * @returns {Promise<Object>} - Action result
   */
  async handleFrivolousCase() {
    if (!this.initialized) {
      throw new Error('Browser not initialized');
    }
    
    try {
      logger.info('Handling frivolous case');
      
      // Click continue button (3 times)
      for (let i = 0; i < 3; i++) {
        // Wait for continue button
        await this.page.waitForSelector('button:has-text("Continue")');
        
        // Click continue
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
          this.page.click('button:has-text("Continue")')
        ]);
      }
      
      // Select response option
      await this.page.waitForSelector('select[name="response"]');
      await this.page.select('select[name="response"]', '01');
      
      // Click submit
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click('button:has-text("Submit")')
      ]);
      
      // Check for error
      const hasError = await this.page.evaluate(() => {
        return document.body.textContent.includes('Error');
      });
      
      if (hasError) {
        logger.info('Encountered error, trying to clear account information');
        
        // Click Clear Account Information
        await this.page.click('button:has-text("Clear Account Information")');
        
        // Click Submit again
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
          this.page.click('button:has-text("Submit")')
        ]);
      }
      
      logger.info('Successfully handled frivolous case');
      
      return {
        action: 'Closed case in E-Oscar with code 01',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error handling frivolous case:', error);
      throw error;
    }
  }
  
  /**
   * Handle a non-frivolous case
   * @param {string} indicatorDetails - Details of the non-frivolous indicator
   * @returns {Promise<Object>} - Action result
   */
  async handleNonFrivolousCase(indicatorDetails) {
    if (!this.initialized) {
      throw new Error('Browser not initialized');
    }
    
    try {
      logger.info('Handling non-frivolous case');
      
      // No action needed in E-Oscar for non-frivolous cases
      
      logger.info('Successfully handled non-frivolous case');
      
      return {
        action: 'Flagged for escalation',
        indicatorDetails,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error handling non-frivolous case:', error);
      throw error;
    }
  }
}

// Export singleton instance
exports.eoscarService = new EOscarService();