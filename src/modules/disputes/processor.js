const logger = require('../../services/logger');
const supabaseService = require('../../services/supabase');
const { loginToEOscar } = require('../auth/login');
const { getClientCredentials } = require('../auth/credentials');
const { categorizeDispute } = require('./categorization');
const { handleFrivolousCase } = require('./frivolous');
const { handleNonFrivolousCase } = require('./non-frivolous');

/**
 * Main function to process disputes
 * @param {string} clientName - The client name to process disputes for (optional)
 * @returns {Promise<Array>} - Array of processed disputes
 */
async function processDisputes(clientName) {
  logger.info(`Starting E-Oscar dispute processing${clientName ? ` for ${clientName}` : ''}`);
  
  try {
    // 1. Get pending disputes from database
    const disputes = await supabaseService.getPendingDisputes(clientName);
    logger.info(`Found ${disputes.length} pending disputes to process`);
    
    if (disputes.length === 0) {
      logger.info('No disputes to process. Exiting.');
      return [];
    }
    
    // Group disputes by client
    const disputesByClient = disputes.reduce((acc, dispute) => {
      const clientName = dispute.client_name;
      if (!acc[clientName]) {
        acc[clientName] = [];
      }
      acc[clientName].push(dispute);
      return acc;
    }, {});
    
    const results = [];
    
    // Process each client's disputes
    for (const [client, clientDisputes] of Object.entries(disputesByClient)) {
      logger.info(`Processing ${clientDisputes.length} disputes for client: ${client}`);
      
      // Get credentials for this client
      const credentials = await getClientCredentials(client);
      
      // Login to E-Oscar
      const { browser, page } = await loginToEOscar(credentials);
      
      try {
        // Process each dispute
        for (const dispute of clientDisputes) {
          const result = await processDispute(page, dispute);
          results.push(result);
          
          // Add a small delay between requests to avoid rate limiting
          await page.waitForTimeout(1000);
        }
      } finally {
        // Close browser
        await browser.close();
      }
      
      logger.info(`Completed processing ${clientDisputes.length} disputes for client: ${client}`);
    }
    
    logger.info(`Processed ${results.length} disputes successfully`);
    return results;
  } catch (error) {
    logger.error(`Error during dispute processing: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Process a single dispute
 * @param {Object} page - Puppeteer page object
 * @param {Object} dispute - Dispute object
 * @returns {Promise<Object>} - Updated dispute object
 */
async function processDispute(page, dispute) {
  logger.info(`Processing dispute ${dispute.control_number} for ${dispute.first_name} ${dispute.last_name}`);
  
  try {
    // 1. Navigate to case search page
    await page.goto(`${process.env.EOSCAR_URL}/oscar/case/search`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 2. Select ACDV from dropdown and enter the control number
    await page.waitForSelector('select[name="caseType"]');
    await page.select('select[name="caseType"]', 'ACDV');
    await page.type('input[name="caseNumber"]', dispute.control_number);
    
    // 3. Click search button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    // 4. Check if case was found
    const caseFound = await page.evaluate(() => {
      return !!document.querySelector('a.case-id-link') || 
             !!document.querySelector('a[href*="case/view"]');
    });
    
    if (!caseFound) {
      throw new Error(`Case not found for control number: ${dispute.control_number}`);
    }
    
    // 5. Click on the case ID link
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('a.case-id-link, a[href*="case/view"]')
    ]);
    
    // 6. Wait for case details to load
    await page.waitForSelector('.case-details, #caseDetailsForm');
    
    // 7. Determine if the case is frivolous based on our business rules
    const categorization = await categorizeDispute(page);
    
    // 8. Handle the case based on categorization
    if (categorization.isFrivolous) {
      // Handle frivolous case
      return await handleFrivolousCase(page, dispute, categorization.details);
    } else {
      // Handle non-frivolous case
      return await handleNonFrivolousCase(page, dispute, categorization.details);
    }
  } catch (error) {
    logger.error(`Error processing dispute ${dispute.control_number}:`, error);
    
    // Log the error to Supabase
    await supabaseService.logDisputeAction({
      dispute_id: dispute.id,
      action_type: 'error',
      action_details: { error: error.message, stack: error.stack }
    });
    
    // Return the dispute with error information
    return {
      ...dispute,
      dispute_status: 'Error',
      resolution_details: { error: error.message }
    };
  }
}

module.exports = {
  processDisputes,
  processDispute
};
