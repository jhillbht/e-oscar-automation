/**
 * Constants for the E-Oscar Dispute Review Automation
 */

// Timeouts
const LOGIN_TIMEOUT = 60000; // 60 seconds
const NAVIGATION_TIMEOUT = 30000; // 30 seconds
const API_TIMEOUT = 10000; // 10 seconds

// Browser settings
const DEFAULT_VIEWPORT = {
  width: 1280,
  height: 800
};

// Date formats
const DATE_FORMAT = 'YYYY-MM-DD';
const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// Dispute statuses
const DISPUTE_STATUS = {
  PENDING: 'Pending',
  ESCALATED: 'Escalated',
  CLOSED: 'Closed',
  ERROR: 'Error'
};

// E-Oscar selectors
const SELECTORS = {
  LOGIN: {
    USERNAME: '#j_username',
    PASSWORD: '#j_password',
    SUBMIT: 'input[type="submit"]',
    OTP: '#oneTimePassword'
  },
  CASE_SEARCH: {
    CASE_TYPE: 'select[name="caseType"]',
    CASE_NUMBER: 'input[name="caseNumber"]',
    SUBMIT: 'button[type="submit"]',
    CASE_LINK: 'a.case-id-link, a[href*="case/view"]'
  },
  CASE_DETAILS: {
    CONTAINER: '.case-details, #caseDetailsForm',
    DISPUTE_CODE_1: '#disputeCode1, .dispute-code-1, [data-field="disputeCode1"]',
    DISPUTE_CODE_2: '#disputeCode2, .dispute-code-2, [data-field="disputeCode2"]',
    IMAGES: '#images, .images, [data-field="images"]',
    FCRA_RELEVANT_INFO: '#fcraRelevantInfo, .fcra-relevant-info, [data-field="fcraRelevantInfo"]'
  },
  CASE_RESOLUTION: {
    CONTINUE: 'button[type="submit"], input[type="submit"], button:contains("Continue"), input[value="Continue"]',
    RESPONSE_CODE: 'select[name="responseCode"], select[id*="responseCode"]',
    SUBMIT: 'button[type="submit"], input[type="submit"], button:contains("Submit"), input[value="Submit"]',
    CLEAR: 'button:contains("Clear Account Information"), input[value*="Clear"]',
    ERROR: '.error, .alert-danger, .alert-error'
  }
};

// Default retry options
const RETRY_OPTIONS = {
  retries: 3,
  retryDelay: 1000,
  factor: 2
};

module.exports = {
  LOGIN_TIMEOUT,
  NAVIGATION_TIMEOUT,
  API_TIMEOUT,
  DEFAULT_VIEWPORT,
  DATE_FORMAT,
  TIMESTAMP_FORMAT,
  DISPUTE_STATUS,
  SELECTORS,
  RETRY_OPTIONS
};