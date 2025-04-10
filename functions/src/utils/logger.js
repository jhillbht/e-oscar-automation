const { Logging } = require('@google-cloud/logging');
const admin = require('firebase-admin');

/**
 * Custom logger for application logs
 */
class Logger {
  constructor() {
    this.gcpLogging = null;
    
    // Try to initialize GCP Logging if credentials are available
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.gcpLogging = new Logging();
        this.log = this.gcpLogging.log('e-oscar-automation');
      }
    } catch (error) {
      console.error('Error initializing GCP Logging:', error);
      this.gcpLogging = null;
    }
  }
  
  /**
   * Write a log entry to Firebase and GCP Logging
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} [metadata] - Additional metadata
   * @returns {Promise<void>}
   */
  async writeLog(level, message, metadata = {}) {
    const timestamp = new Date();
    
    // Console log
    console[level](`[${timestamp.toISOString()}] ${message}`, metadata);
    
    try {
      // Firebase Firestore log
      try {
        await admin.firestore().collection('logs').add({
          level,
          message,
          metadata,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error writing to Firestore logs:', error);
      }
      
      // GCP Logging
      if (this.gcpLogging) {
        try {
          const entry = {
            severity: level.toUpperCase(),
            timestamp,
            message,
            ...metadata
          };
          
          await this.log.write(this.log.entry(entry));
        } catch (error) {
          console.error('Error writing to GCP Logging:', error);
        }
      }
    } catch (error) {
      console.error('Error in logging system:', error);
    }
  }
  
  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} [metadata] - Additional metadata
   */
  info(message, metadata = {}) {
    this.writeLog('info', message, metadata);
  }
  
  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} [metadata] - Additional metadata
   */
  warn(message, metadata = {}) {
    this.writeLog('warn', message, metadata);
  }
  
  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object|Error} [error] - Error object or metadata
   */
  error(message, error = {}) {
    let metadata = {};
    
    if (error instanceof Error) {
      metadata = {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      };
    } else {
      metadata = error;
    }
    
    this.writeLog('error', message, metadata);
  }
}

// Export singleton instance
exports.logger = new Logger();