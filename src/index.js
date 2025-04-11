require('dotenv').config();
const cron = require('node-cron');
const logger = require('./services/logger');
const { processDisputes } = require('./modules/disputes/processor');
const { downloadReports } = require('./modules/reporting/download-reports');
const { combineDisputeData } = require('./modules/reporting/data-processor');

// Parse command line arguments
const args = process.argv.slice(2);
const clientArg = args.find(arg => arg.startsWith('--client='));
const clientName = clientArg ? clientArg.split('=')[1] : null;

/**
 * Check if today is Monday to determine date range
 * @returns {Object} Object with startDate and endDate
 */
function getDateRange() {
  const today = new Date();
  const isMonday = today.getDay() === 1;
  
  let startDate, endDate;
  if (isMonday) {
    // If Monday, start from Friday
    const friday = new Date(today);
    friday.setDate(today.getDate() - 3);
    startDate = friday.toISOString().split('T')[0];
  } else {
    // Otherwise, start from yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    startDate = yesterday.toISOString().split('T')[0];
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  endDate = yesterday.toISOString().split('T')[0];
  
  return { startDate, endDate };
}

/**
 * Run the full automation process
 */
async function runAutomation() {
  try {
    logger.info(`Starting E-Oscar automation${clientName ? ` for client: ${clientName}` : ''}`);
    
    // Get date range based on current day
    const dateRange = getDateRange();
    logger.info(`Using date range: ${dateRange.startDate} to ${dateRange.endDate}`);
    
    // Step 1: Download reports from E-Oscar
    const reportResults = await downloadReports(clientName, dateRange);
    logger.info(`Downloaded ${reportResults.length} reports`);
    
    // Step 2: Process and combine data
    const disputeData = await combineDisputeData(reportResults);
    logger.info(`Processed ${disputeData.length} disputes`);
    
    // Step 3: Process disputes (categorize and take actions)
    const processingResults = await processDisputes(clientName);
    logger.info(`Processed ${processingResults.length} disputes`);
    
    logger.info('E-Oscar automation completed successfully');
    return { success: true, reportResults, disputeData, processingResults };
  } catch (error) {
    logger.error(`Error in automation process: ${error.message}`, { stack: error.stack });
    return { success: false, error: error.message };
  }
}

// If this script is run directly, execute the automation
if (require.main === module) {
  // Check if we should run on a schedule
  const scheduleExpr = process.env.CRON_SCHEDULE;
  if (scheduleExpr) {
    logger.info(`Setting up scheduled job with cron expression: ${scheduleExpr}`);
    cron.schedule(scheduleExpr, () => {
      runAutomation().catch(err => {
        logger.error(`Scheduled job failed: ${err.message}`, { stack: err.stack });
      });
    });
    logger.info('Scheduler started. Waiting for scheduled run time...');
  } else {
    // Run immediately
    runAutomation().catch(err => {
      logger.error(`Automation failed: ${err.message}`, { stack: err.stack });
      process.exit(1);
    });
  }
}

module.exports = { runAutomation, getDateRange };
