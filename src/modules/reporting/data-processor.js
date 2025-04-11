const fs = require('fs');
const logger = require('../../services/logger');
const sheetsService = require('../../services/sheets');
const supabaseService = require('../../services/supabase');
const constants = require('../../config/constants');

/**
 * Process and combine dispute data from downloaded reports
 * @param {Array} reportResults - Results from downloadReports
 * @returns {Promise<Array>} - Combined dispute data
 */
async function combineDisputeData(reportResults) {
  logger.info('Starting to process and combine dispute data');
  
  const successfulReports = reportResults.filter(result => result.success);
  
  if (successfulReports.length === 0) {
    logger.warn('No successful reports to process');
    return [];
  }
  
  try {
    // 1. Process each report
    const processedData = [];
    
    for (const report of successfulReports) {
      // Read CSV file
      const csvData = fs.readFileSync(report.reportPath, 'utf8');
      
      // Parse CSV
      const parsedData = sheetsService.parseCSVReport(csvData);
      
      // Add client name to each record
      const clientData = parsedData.map(record => ({
        ...record,
        client_name: report.clientName
      }));
      
      processedData.push(...clientData);
      
      logger.info(`Processed ${clientData.length} disputes from ${report.clientName}`);
    }
    
    // 2. Filter to required columns
    const filteredData = processedData.map(record => {
      const filtered = {};
      constants.REQUIRED_COLUMNS.forEach(column => {
        filtered[column] = record[column] || '';
      });
      filtered.client_name = record.client_name;
      return filtered;
    });
    
    // 3. Update Google Sheets
    await sheetsService.updateDisputeSheet(filteredData);
    
    // 4. Store in Supabase
    await storeDisputesInSupabase(filteredData);
    
    logger.info(`Successfully combined and processed ${filteredData.length} disputes`);
    
    return filteredData;
  } catch (error) {
    logger.error(`Error combining dispute data: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Store disputes in Supabase
 * @param {Array} disputes - Array of dispute objects
 * @returns {Promise<Array>} - Array of created disputes
 */
async function storeDisputesInSupabase(disputes) {
  const createdDisputes = [];
  
  for (const dispute of disputes) {
    try {
      const created = await supabaseService.createDispute({
        client_name: dispute.client_name,
        control_number: dispute['Control Number'],
        date_furnisher: dispute['Date Furnisher (Account)'],
        date_received: dispute['Date Received'],
        response_due_date: dispute['Response Due Date'],
        first_name: dispute['First Name'],
        last_name: dispute['Last Name']
      });
      
      createdDisputes.push(created);
    } catch (error) {
      logger.error(`Error storing dispute in Supabase: ${error.message}`, { 
        dispute: dispute['Control Number'],
        stack: error.stack
      });
    }
  }
  
  logger.info(`Stored ${createdDisputes.length} disputes in Supabase`);
  return createdDisputes;
}

module.exports = {
  combineDisputeData,
  storeDisputesInSupabase
};
