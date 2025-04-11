#!/usr/bin/env node
/**
 * Script to run E-Oscar automation on a daily basis
 */
const { execSync } = require('child_process');
const path = require('path');
const logger = require('../src/services/logger');

// Schedule the job to run at 8:00 AM every day
const cron = require('node-cron');

// Function to run the automation
function runAutomation() {
  try {
    const scriptPath = path.join(__dirname, 'run.sh');
    logger.info(`Running automation script: ${scriptPath}`);
    execSync(scriptPath, { stdio: 'inherit' });
    logger.info('Automation completed successfully');
    return true;
  } catch (error) {
    logger.error(`Error running automation: ${error.message}`, { stack: error.stack });
    return false;
  }
}

// Schedule the job
cron.schedule('0 8 * * *', () => {
  logger.info('Running scheduled automation job');
  runAutomation();
});

logger.info('E-Oscar automation scheduler started');
logger.info('Scheduled to run at 8:00 AM every day');
logger.info('Waiting for scheduled run time...');

// Keep the script running
process.stdin.resume();

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Scheduler shutting down');
  process.exit(0);
});
