const nodemailer = require('nodemailer');
const { sendSlackMessage } = require('../services/slack');
const { logger } = require('./logger');

/**
 * Send email notification
 * @param {Object} options - Email options
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message
 * @param {Array<string>} [options.recipients] - Email recipients (defaults to env var)
 * @returns {Promise<boolean>} - Success status
 */
async function sendEmailNotification({ subject, message, recipients }) {
  try {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const defaultRecipients = process.env.ALERT_EMAIL;
    
    // Check if email is configured
    if (!emailUser || !emailPassword) {
      logger.warn('Email notifications not configured');
      return false;
    }
    
    // Configure email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
    
    // Prepare email
    const mailOptions = {
      from: emailUser,
      to: recipients || defaultRecipients,
      subject: `E-Oscar Automation: ${subject}`,
      text: message
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    logger.info(`Email notification sent: ${subject}`);
    return true;
  } catch (error) {
    logger.error('Error sending email notification:', error);
    return false;
  }
}

/**
 * Send notification to both email and Slack
 * @param {Object} options - Notification options
 * @param {string} options.subject - Notification subject
 * @param {string} options.message - Notification message
 * @param {Array<string>} [options.recipients] - Email recipients
 * @param {string} [options.slackChannel] - Slack channel
 * @returns {Promise<boolean>} - Success status
 */
async function sendNotification(options) {
  try {
    // Send email
    const emailResult = await sendEmailNotification(options);
    
    // Send Slack message
    const slackResult = await sendSlackMessage(
      `${options.subject}\n\n${options.message}`,
      options.slackChannel
    );
    
    return emailResult || slackResult;
  } catch (error) {
    logger.error('Error sending notification:', error);
    return false;
  }
}

module.exports = {
  sendEmailNotification,
  sendNotification
};