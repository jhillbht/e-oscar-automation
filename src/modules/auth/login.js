const puppeteer = require('puppeteer');
const logger = require('../../services/logger');
const slackService = require('../../services/slack');
const constants = require('../../config/constants');

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
    await page.goto(constants.EOSCAR_URL, { 
      waitUntil: 'networkidle0',
      timeout: constants.TIMEOUTS.NAVIGATION 
    });
    
    // Enter username and password
    await page.waitForSelector('#j_username', { timeout: constants.TIMEOUTS.ELEMENT });
    await page.type('#j_username', credentials.username);
    await page.type('#j_password', credentials.password);
    
    // Click login button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: constants.TIMEOUTS.NAVIGATION }),
      page.click('input[type="submit"]')
    ]);
    
    // Check if OTP is required
    const otpRequired = await page.evaluate(() => {
      return !!document.querySelector('#oneTimePassword');
    });
    
    if (otpRequired) {
      await handleOTP(page);
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
    
    logger.info(`Successfully logged in to E-Oscar as ${credentials.username}`);
    return { browser, page };
  } catch (error) {
    // Close browser on error
    await browser.close();
    logger.error(`Login error: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Handle the OTP step in the login process
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function handleOTP(page) {
  // Wait for OTP screen
  await page.waitForSelector('#oneTimePassword', { timeout: constants.TIMEOUTS.ELEMENT });
  
  logger.info('OTP screen detected. Retrieving OTP code...');
  
  let attemptsLeft = 3;
  let otp = null;
  
  while (attemptsLeft > 0 && !otp) {
    try {
      // Get OTP from Slack
      otp = await slackService.getOTPFromSlack();
      
      // Enter OTP and submit
      await page.type('#oneTimePassword', otp);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: constants.TIMEOUTS.NAVIGATION }),
        page.click('input[type="submit"]')
      ]);
      
      // Check if we're still on the OTP page (invalid code)
      const stillOnOtpPage = await page.evaluate(() => {
        return !!document.querySelector('#oneTimePassword');
      });
      
      if (stillOnOtpPage) {
        logger.warn('Invalid OTP code. Trying again...');
        otp = null; // Reset OTP to try again
        attemptsLeft--;
        
        // Clear the OTP field
        await page.evaluate(() => {
          document.querySelector('#oneTimePassword').value = '';
        });
      }
    } catch (error) {
      logger.error(`Error in OTP handling: ${error.message}`, { stack: error.stack });
      attemptsLeft--;
      
      if (attemptsLeft <= 0) {
        throw new Error(`Failed to handle OTP after multiple attempts: ${error.message}`);
      }
      
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    }
  }
  
  if (!otp) {
    throw new Error('Failed to retrieve a valid OTP code');
  }
  
  logger.info('OTP authentication successful');
}

module.exports = { loginToEOscar };
