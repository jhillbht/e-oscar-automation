const { WebClient } = require('@slack/web-api');
const { logger } = require('../utils/logger');

// Slack configuration
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_OTP_CHANNEL = process.env.SLACK_OTP_CHANNEL || 'otp-test';

// Initialize Slack client
const slack = new WebClient(SLACK_TOKEN);

/**
 * Get OTP from Slack channel
 * @returns {Promise<string|null>} - OTP code or null if not found
 */
async function getOTP() {
  try {
    logger.info('Fetching OTP from Slack');
    
    // Check if token is configured
    if (!SLACK_TOKEN) {
      throw new Error('Slack token not configured');
    }
    
    // Get recent messages from the OTP channel
    const result = await slack.conversations.history({
      channel: SLACK_OTP_CHANNEL,
      limit: 5 // Only get the 5 most recent messages
    });
    
    const messages = result.messages || [];
    
    // Find the most recent message that contains an OTP (from the last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const otpMessage = messages.find(msg => {
      const timestamp = parseFloat(msg.ts) * 1000; // Convert Slack timestamp to milliseconds
      return (
        timestamp > fiveMinutesAgo && 
        (msg.text.includes('OTP') || msg.text.includes('code') || /\d{6}/.test(msg.text))
      );
    });
    
    if (!otpMessage) {
      logger.warn('No recent OTP found in Slack');
      return null;
    }
    
    // Extract the 6-digit OTP code using regex
    const otpMatch = otpMessage.text.match(/\b\d{6}\b/);
    if (!otpMatch) {
      logger.warn('Could not find 6-digit OTP code in message');
      return null;
    }
    
    const otp = otpMatch[0];
    
    // Add a reaction to mark the message as processed
    await slack.reactions.add({
      channel: SLACK_OTP_CHANNEL,
      timestamp: otpMessage.ts,
      name: 'white_check_mark'
    });
    
    logger.info(`Found OTP code: ${otp}`);
    return otp;
  } catch (error) {
    logger.error('Error getting OTP from Slack:', error);
    return null;
  }
}

/**
 * Send Slack message
 * @param {string} message - Message text
 * @param {string} channel - Target channel (defaults to OTP channel)
 * @returns {Promise<boolean>} - Success status
 */
async function sendSlackMessage(message, channel = SLACK_OTP_CHANNEL) {
  try {
    // Check if token is configured
    if (!SLACK_TOKEN) {
      throw new Error('Slack token not configured');
    }
    
    // Send message
    await slack.chat.postMessage({
      channel,
      text: message
    });
    
    return true;
  } catch (error) {
    logger.error('Error sending Slack message:', error);
    return false;
  }
}

module.exports = {
  getOTP,
  sendSlackMessage
};