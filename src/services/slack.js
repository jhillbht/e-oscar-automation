const { WebClient } = require('@slack/web-api');
const logger = require('./logger');

// Initialize Slack client
const slackToken = process.env.SLACK_TOKEN;
const slackOtpChannel = process.env.SLACK_OTP_CHANNEL || 'otp-test';

let slack;
if (slackToken) {
  slack = new WebClient(slackToken);
} else {
  logger.warn('SLACK_TOKEN not provided. Slack integration disabled.');
}

/**
 * Get OTP from Slack channel
 * @returns {Promise<string>} - OTP code
 */
async function getOTPFromSlack() {
  if (!slack) {
    throw new Error('Slack client not initialized');
  }
  
  logger.info('Checking Slack for OTP...');
  
  try {
    // Get recent messages from the OTP channel
    const result = await slack.conversations.history({
      channel: slackOtpChannel,
      limit: 5 // Only get the 5 most recent messages
    });
    
    const messages = result.messages || [];
    
    // Find the most recent message that contains an OTP (from the last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const otpMessage = messages.find(msg => {
      const timestamp = parseFloat(msg.ts) * 1000; // Convert Slack timestamp to milliseconds
      return (
        timestamp > fiveMinutesAgo && 
        (msg.text.includes('OTP') || msg.text.includes('code') || /\b\d{6}\b/.test(msg.text))
      );
    });
    
    if (!otpMessage) {
      throw new Error('No recent OTP found in Slack');
    }
    
    // Extract the 6-digit OTP code using regex
    const otpMatch = otpMessage.text.match(/\b\d{6}\b/);
    if (!otpMatch) {
      throw new Error('Could not find 6-digit OTP code in message');
    }
    
    const otp = otpMatch[0];
    
    // Add a reaction to mark the message as processed
    await slack.reactions.add({
      channel: slackOtpChannel,
      timestamp: otpMessage.ts,
      name: 'white_check_mark'
    });
    
    logger.info(`Found OTP code: ${otp}`);
    return otp;
  } catch (error) {
    logger.error('Error getting OTP from Slack:', error);
    throw new Error(`Failed to retrieve OTP from Slack: ${error.message}`);
  }
}

/**
 * Send a message to a Slack channel
 * @param {string} channel - Channel ID or name
 * @param {string} text - Message text
 * @param {Array} blocks - Message blocks (optional)
 * @returns {Promise<Object>} - Slack API response
 */
async function sendMessage(channel, text, blocks = []) {
  if (!slack) {
    logger.warn(`Cannot send message to Slack: ${text}`);
    return null;
  }
  
  try {
    const result = await slack.chat.postMessage({
      channel,
      text,
      blocks: blocks.length > 0 ? blocks : undefined
    });
    
    logger.info(`Message sent to Slack channel ${channel}`);
    return result;
  } catch (error) {
    logger.error(`Error sending message to Slack: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * Send an alert message to the designated Slack channel
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} level - Alert level (info, warning, error)
 * @returns {Promise<Object>} - Slack API response
 */
async function sendAlert(title, message, level = 'info') {
  const alertChannel = process.env.SLACK_ALERT_CHANNEL || slackOtpChannel;
  
  let color;
  switch (level) {
    case 'info':
      color = '#2eb886';
      break;
    case 'warning':
      color = '#daa038';
      break;
    case 'error':
      color = '#cc2727';
      break;
    default:
      color = '#2eb886';
  }
  
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${title}*\n${message}`
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Level:* ${level.toUpperCase()} | *Time:* ${new Date().toISOString()}`
        }
      ]
    }
  ];
  
  return sendMessage(alertChannel, title, blocks);
}

module.exports = {
  slack,
  getOTPFromSlack,
  sendMessage,
  sendAlert
};
