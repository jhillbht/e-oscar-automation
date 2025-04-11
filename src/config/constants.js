/**
 * Application constants
 */
module.exports = {
  // E-Oscar URL
  EOSCAR_URL: process.env.EOSCAR_URL || 'https://www.e-oscar-web.net/',
  
  // Browser settings
  BROWSER_SETTINGS: {
    headless: process.env.NODE_ENV === 'production',
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
  },
  
  // Dispute categorization rules
  DISPUTE_RULES: {
    NON_FRIVOLOUS_INDICATORS: [
      {
        field: 'disputeCode1',
        condition: value => value && value.includes('103'),
        reason: 'Dispute Code 1 contains "103"'
      },
      {
        field: 'disputeCode2',
        condition: value => value && value.includes('103'),
        reason: 'Dispute Code 2 contains "103"'
      },
      {
        field: 'images',
        condition: value => value && value !== '--' && value !== '0',
        reason: 'Images has value other than "--" or "0"'
      },
      {
        field: 'fcraRelevantInfo',
        condition: value => value && value !== '--',
        reason: 'FCRA Relevant Information has value other than "--"'
      }
    ]
  },
  
  // ClickUp status mappings
  CLICKUP_STATUSES: {
    NEED_TO_ESCALATE: 'NEED TO ESCALATE',
    CLOSED: 'CLOSED'
  },
  
  // Default timeout values
  TIMEOUTS: {
    NAVIGATION: 30000,      // 30 seconds for page navigation
    ELEMENT: 10000,         // 10 seconds for element to appear
    OTP_CHECK: 300000,      // 5 minutes for OTP checking
    DOWNLOAD: 60000,        // 1 minute for file download
    REQUEST: 30000          // 30 seconds for API requests
  },
  
  // Required columns for dispute data
  REQUIRED_COLUMNS: [
    'Control Number',
    'Date Furnisher (Account)',
    'Date Received',
    'Response Due Date',
    'First Name',
    'Last Name'
  ],
  
  // Activity report parameters
  ACTIVITY_REPORT_PARAMS: {
    CASE_TYPE: 'ACDV',
    REOCCURRENCE: 'Ad Hoc',
    FILTER_BY: 'Date Received'
  },
  
  // E-Oscar response codes
  RESPONSE_CODES: {
    ACCURATE: '01 - Information accurate as of last submission. No changes.'
  }
};
