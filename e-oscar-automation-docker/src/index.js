require('dotenv').config();
const logger = require('./services/logger');
const { processDisputes } = require('./modules/disputes/processor');

// Parse command line arguments
const args = process.argv.slice(2);
const clientArg = args.find(arg => arg.startsWith('--client='));
const clientName = clientArg ? clientArg.split('=')[1] : null;

/**
 * Run the dispute review automation
 */
async function runAutomation() {
  try {
    logger.info(`Starting E-Oscar dispute review automation${clientName ? ` for client: ${clientName}` : ''}`);
    
    // Process disputes (categorize and take actions)
    const processingResults = await processDisputes(clientName);
    logger.info(`Processed ${processingResults.length} disputes`);
    
    logger.info('E-Oscar dispute review completed successfully');
    return { success: true, processingResults };
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
