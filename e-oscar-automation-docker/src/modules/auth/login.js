const puppeteer = require('puppeteer');
const logger = require('../../services/logger');
const constants = require('../../config/constants');
const supabaseService = require('../../services/supabase');

/**
 * Get OTP from Slack channel
 * @returns {Promise<string>} - OTP code
 */
async function getOTPFromSlack() {
  logger.info('Checking Slack for OTP...');
  
  try {
    // Get recent messages from the OTP channel using the Slack API
    // This is a simplified mock implementation for demonstration
    // In production, this would use the Slack API to get the actual OTP
    
    const mockOTP = '123456';
    logger.info(`Found OTP code: ${mockOTP}`);
    return mockOTP;
  } catch (error) {
    logger.error('Error getting OTP from Slack:', error);
    throw new Error('Failed to retrieve OTP from Slack');
  }
}

/**
 * Login to E-Oscar with credentials and handle OTP
 * @param {Object} credentials - Credentials object with username and password
 * @returns {Promise<Object>} - Browser and page objects
 */
async function loginToEOscar(credentials) {
  if (!credentials || !credentials.username || !credentials.password) {
    throw new Error('Invalid credentials');
  }
  
  logger.info(`Logging in to E-Oscar as ${credentials.username}`);
  
  // Launch browser
  const browser = await puppeteer.launch(constants.BROWSER_SETTINGS);
  const page = await browser.newPage();
  
  try {
    // Navigate to E-Oscar login page
    await page.goto(constants.EOSCAR_URL);
    
    // Enter username and password
    await page.waitForSelector('#j_username');
    await page.type('#j_username', credentials.username);
    await page.type('#j_password', credentials.password);
    
    // Click login button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('input[type="submit"]')
    ]);
    
    // Check if OTP is required
    const otpRequired = await page.evaluate(() => {
      return !!document.querySelector('#oneTimePassword');
    });
    
    if (otpRequired) {
      // Wait for OTP screen and get OTP from Slack
      await page.waitForSelector('#oneTimePassword');
      const otp = await getOTPFromSlack();
      
      // Enter OTP and submit
      await page.type('#oneTimePassword', otp);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('input[type="submit"]')
      ]);
    }
    
    // Verify successful login
    const loggedIn = await page.evaluate(() => {
      return !!document.querySelector('.navbar') || 
             !!document.querySelector('#header') ||
             document.title.includes('Home');
    });
    
    if (!loggedIn) {
      throw new Error('Failed to log in to E-Oscar');
    }
    
    logger.info('Successfully logged in to E-Oscar');
    
    // Log authentication success
    await supabaseService.logDisputeAction({
      dispute_id: null, // No specific dispute for login
      action_type: 'login_success',
      action_details: {
        username: credentials.username,
        client_name: credentials.client_name,
        timestamp: new Date().toISOString()
      }
    });
    
    return { browser, page };
  } catch (error) {
    // Close browser on error
    if (browser) {
      await browser.close();
    }
    
    // Log authentication failure
    logger.error(`Login failed for ${credentials.username}: ${error.message}`);
    
    await supabaseService.logDisputeAction({
      dispute_id: null, // No specific dispute for login
      action_type: 'login_failure',
      action_details: {
        username: credentials.username,
        client_name: credentials.client_name,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
    
    throw error;
  }
}

module.exports = { loginToEOscar, getOTPFromSlack };