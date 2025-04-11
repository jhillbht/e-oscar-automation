require('dotenv').config();
const logger = require('./services/logger');

// Determine if we're in test mode
const TEST_MODE = process.env.TEST_MODE === 'true';

async function runAutomation() {
  try {
    logger.info(`Starting E-Oscar dispute review automation${TEST_MODE ? ' in TEST MODE' : ''}`);
    
    if (TEST_MODE) {
      // Run in test mode
      logger.info('Running in TEST MODE - using mock data and skipping actual API calls');
      
      // Import the processor module (which will use mock data in test mode)
      const { processDisputes } = require('./modules/disputes/processor');
      
      // Process disputes with test client
      const results = await processDisputes('TestClient');
      
      logger.info(`TEST MODE: Processed ${results.length} mock disputes`);
      
      // Log the results for verification
      logger.info('TEST RESULTS:', { results });
      
      logger.info('TEST MODE: E-Oscar dispute review completed successfully');
      return { success: true, testResults: results };
    } else {
      // Run in normal mode
      const { processDisputes } = require('./modules/disputes/processor');
      
      // Get client name from command line args if provided
      const args = process.argv.slice(2);
      const clientArg = args.find(arg => arg.startsWith('--client='));
      const clientName = clientArg ? clientArg.split('=')[1] : null;
      
      // Process disputes
      const results = await processDisputes(clientName);
      
      logger.info(`Processed ${results.length} disputes`);
      logger.info('E-Oscar dispute review completed successfully');
      
      return { success: true, results };
    }
  } catch (error) {
    logger.error(`Error in automation process: ${error.message}`, { stack: error.stack });
    return { success: false, error: error.message };
  }
}

// If this script is run directly, execute the automation
if (require.main === module) {
  runAutomation().catch(err => {
    logger.error(`Automation failed: ${err.message}`, { stack: err.stack });
    process.exit(1);
  });
}

module.exports = { runAutomation };
