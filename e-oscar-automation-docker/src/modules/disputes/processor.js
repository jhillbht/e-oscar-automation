const logger = require('../../services/logger');
const { loginToEOscar } = require('../auth/login');
const { getClientCredentials } = require('../auth/credentials');
const { categorizeDispute } = require('./categorization');
const { handleFrivolousCase } = require('./frivolous');
const { handleNonFrivolousCase } = require('./non-frivolous');
const supabaseService = require('../../services/supabase');

/**
 * Main function to process disputes
 * @param {string} clientName - The client name to process disputes for (optional)
 * @returns {Promise<Array>} - Array of processed disputes
 */
async function processDisputes(clientName) {
  logger.info(`Starting E-Oscar dispute processing${clientName ? ` for ${clientName}` : ''}`);
  
  try {
    // 1. Get pending disputes from Supabase
    let disputes = [];
    
    if (clientName) {
      // Process disputes for a specific client
      disputes = await supabaseService.getPendingDisputes(clientName);
    } else {
      // In production, this would retrieve disputes for all clients
      // For now, we'll use the mock implementation
      const mockDisputes = [
        {
          id: '1',
          client_name: 'TestClient',
          control_number: '12345678',
          first_name: 'John',
          last_name: 'Doe',
          clickup_task_id: 'abc123',
          dispute_status: 'Pending'
        }
      ];
      disputes = mockDisputes;
    }
    
    logger.info(`Found ${disputes.length} pending disputes to process`);
    
    if (disputes.length === 0) {
      logger.info('No disputes to process. Exiting.');
      return [];
    }
    
    // Group disputes by client
    const disputesByClient = disputes.reduce((acc, dispute) => {
      const client = dispute.client_name;
      if (!acc[client]) {
        acc[client] = [];
      }
      acc[client].push(dispute);
      return acc;
    }, {});
    
    const results = [];
    
    // Process each client's disputes
    for (const [client, clientDisputes] of Object.entries(disputesByClient)) {
      logger.info(`Processing ${clientDisputes.length} disputes for client: ${client}`);
      
      try {
        // 2. Get credentials for the client
        const credentials = await getClientCredentials(client);
        
        // 3. Log in to E-Oscar
        const { browser, page } = await loginToEOscar(credentials);
        
        try {
          // 4. Process each dispute
          for (const dispute of clientDisputes) {
            try {
              logger.info(`Processing dispute ${dispute.control_number} for ${dispute.first_name} ${dispute.last_name}`);
              
              // 5. Search for the case
              await page.goto(`${process.env.EOSCAR_URL || 'https://www.e-oscar-web.net/oscar/case/search'}`);
              await page.waitForSelector('select[name="caseType"]');
              await page.select('select[name="caseType"]', 'ACDV');
              await page.type('input[name="caseNumber"]', dispute.control_number);
              
              // Click search button
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('button[type="submit"]')
              ]);
              
              // Check if case was found
              const caseFound = await page.evaluate(() => {
                return !!document.querySelector('a.case-id-link') || 
                      !!document.querySelector('a[href*="case/view"]');
              });
              
              if (!caseFound) {
                throw new Error(`Case not found for control number: ${dispute.control_number}`);
              }
              
              // Click on the case ID link
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('a.case-id-link, a[href*="case/view"]')
              ]);
              
              // Wait for case details to load
              await page.waitForSelector('.case-details, #caseDetailsForm');
              
              // 6. Categorize the dispute
              const categorization = await categorizeDispute(page);
              
              // 7. Handle the dispute based on categorization
              let result;
              if (categorization.isFrivolous) {
                // Handle frivolous case
                result = await handleFrivolousCase(page, dispute, categorization.details);
              } else {
                // Handle non-frivolous case
                result = await handleNonFrivolousCase(page, dispute, categorization.details);
              }
              
              // 8. Update the dispute in Supabase
              await supabaseService.updateDispute({
                id: dispute.id,
                is_frivolous: categorization.isFrivolous,
                dispute_status: categorization.isFrivolous ? 'Closed' : 'Escalated',
                resolution_details: result.resolution_details,
                processed_at: new Date().toISOString()
              });
              
              // 9. Log the action
              await supabaseService.logDisputeAction({
                dispute_id: dispute.id,
                action_type: categorization.isFrivolous ? 'close_frivolous' : 'escalate_non_frivolous',
                action_details: {
                  categorization,
                  resolution: result.resolution_details
                }
              });
              
              results.push(result);
            } catch (error) {
              logger.error(`Error processing dispute ${dispute.control_number}:`, error);
              
              // Log the error
              await supabaseService.logDisputeAction({
                dispute_id: dispute.id,
                action_type: 'error',
                action_details: { 
                  error: error.message,
                  stack: error.stack 
                }
              });
              
              // Update dispute status to Error
              await supabaseService.updateDispute({
                id: dispute.id,
                dispute_status: 'Error',
                resolution_details: { 
                  error: error.message
                },
                processed_at: new Date().toISOString()
              });
            }
          }
        } finally {
          // Close browser
          if (browser) {
            await browser.close();
          }
        }
      } catch (error) {
        logger.error(`Error processing client ${client}: ${error.message}`, { stack: error.stack });
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

module.exports = {
  processDisputes
};