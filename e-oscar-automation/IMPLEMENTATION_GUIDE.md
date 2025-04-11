# E-Oscar Dispute Review Automation - Implementation Guide

This guide provides detailed instructions for setting up, configuring, and running the E-Oscar Dispute Review Automation tool.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Automation](#running-the-automation)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## Overview

The E-Oscar Dispute Review Automation tool automates the "Review and Categorize Disputes" step of the E-Oscar dispute handling process, saving approximately 1 hour of developer time each day. The tool:

1. Logs into E-Oscar with client credentials
2. Processes pending disputes from the database
3. Categorizes each dispute as frivolous or non-frivolous based on business rules
4. Takes appropriate actions in both E-Oscar and ClickUp based on the categorization

## Prerequisites

- **Server Requirements**:
  - Node.js 18.x or higher
  - Docker (if running containerized)
  - Access to AWS remote desktop (for production)

- **API Access**:
  - Supabase database (for credential and dispute storage)
  - Slack workspace with a bot token (for OTP retrieval)
  - ClickUp API token with permissions for task management

- **Accounts**:
  - E-Oscar account credentials for each client
  - Access to df-disputes@array.com for OTP receipt
  - Slack workspace access with the bot added to the OTP channel

## Installation

### Docker Installation (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/array/e-oscar-automation.git
   cd e-oscar-automation
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your credentials (see [Configuration](#configuration) section).

4. Build and start the container:
   ```bash
   docker-compose up -d
   ```

### Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/array/e-oscar-automation.git
   cd e-oscar-automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your credentials (see [Configuration](#configuration) section).

## Configuration

### Environment Variables

Edit the `.env` file with the following settings:

```
# Supabase Configuration
SUPABASE_URL=https://rbipwoarcmbqpeolyyzt.supabase.co
SUPABASE_KEY=your-supabase-service-key

# Slack Configuration
SLACK_TOKEN=your-slack-bot-token
SLACK_OTP_CHANNEL=otp-test
SLACK_ALERT_CHANNEL=e-oscar-alerts

# E-Oscar Configuration
EOSCAR_URL=https://www.e-oscar-web.net/

# ClickUp Configuration
CLICKUP_API_TOKEN=your-clickup-api-token
CLICKUP_LIST_ID=your-clickup-list-id

# Logging Configuration
LOG_PATH=./logs
LOG_LEVEL=info

# Email Notification (optional)
ALERT_EMAIL=team@array.com

# Scheduling (optional)
CRON_SCHEDULE=0 9 * * *
```

### Supabase Database Setup

The automation requires a properly configured Supabase database with the following tables:

1. `eoscar_credentials` - Stores client login credentials
2. `eoscar_dispute_details` - Stores dispute information
3. `eoscar_dispute_audit` - Tracks dispute processing actions

Ensure that the Supabase functions are properly set up as described in the documentation.

### Slack OTP Channel

1. Create a dedicated Slack channel for OTPs (e.g., #otp-test)
2. Set up the df-disputes@array.com email to forward OTPs to this channel
3. Create a Slack bot with the following permissions:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `reactions:write`
4. Add the bot to the OTP channel

## Running the Automation

### Manual Execution

Run the automation manually using one of the following methods:

#### Linux/macOS:
```bash
./scripts/run.sh
```

#### Windows:
```cmd
scripts\run.bat
```

#### Node.js:
```bash
node src/index.js
```

### Scheduled Execution

To run the automation on a schedule:

#### Using the built-in scheduler:
```bash
node scripts/run-daily.js
```

This will start a daemon that runs the automation daily at 9:00 AM (configurable in the `CRON_SCHEDULE` environment variable).

#### Using system cron (Linux/macOS):
```
0 9 * * * cd /path/to/e-oscar-automation && ./scripts/run.sh >> /var/log/e-oscar-cron.log 2>&1
```

#### Using Task Scheduler (Windows):
Create a scheduled task that runs `scripts\run.bat` daily at 9:00 AM.

## Monitoring and Maintenance

### Logs

Logs are stored in the `logs` directory:
- `e-oscar-[date].log` - Daily logs
- `error.log` - Error-only logs

### Slack Notifications

The automation sends status updates to the configured Slack channel:
- Job start/completion notifications
- Error alerts
- Password expiration warnings

### Password Management

E-Oscar passwords expire every 30-60 days. When a password expires:

1. Update the password in the E-Oscar system
2. Update the password in the Supabase `eoscar_credentials` table
3. The automation will automatically track the new expiration date

### Audit Trail

All actions are logged to the `eoscar_dispute_audit` table in Supabase. This provides a complete audit trail of:
- All categorization decisions
- Actions taken in E-Oscar and ClickUp
- Error events

## Troubleshooting

### Common Issues

#### OTP Retrieval Issues
- **Symptom**: Automation fails to get OTP from Slack
- **Solution**: 
  - Verify the Slack bot token is correct
  - Ensure the bot is in the OTP channel
  - Check that OTPs are being forwarded correctly from df-disputes@array.com

#### Browser Automation Issues
- **Symptom**: Puppeteer fails to interact with E-Oscar website
- **Solution**:
  - Check if E-Oscar website structure has changed
  - Try running in non-headless mode for debugging
  - Update selectors in the code if needed

#### Authentication Issues
- **Symptom**: Login to E-Oscar fails
- **Solution**:
  - Check if credentials are correct in Supabase
  - Verify if passwords have expired
  - Ensure the OTP process is working correctly

#### ClickUp Integration Issues
- **Symptom**: ClickUp tasks are not being updated
- **Solution**:
  - Verify the ClickUp API token is correct
  - Check if the list ID is correct
  - Ensure the API token has sufficient permissions

### Logs to Check

1. Application logs in `logs/` directory
2. Docker logs (if using Docker): `docker logs e-oscar-dispute-review`
3. Supabase audit logs in the `eoscar_dispute_audit` table

### Support

For additional support, contact the Array development team at dev@array.com.

## FAQ

**Q: How often should the automation run?**
A: We recommend running it once daily, preferably in the morning.

**Q: What happens if E-Oscar is down?**
A: The automation will log the error and exit. It will try again on the next scheduled run.

**Q: Does it handle all dispute types?**
A: Currently it only handles ACDV dispute types.

**Q: What if the categorization rules change?**
A: Update the rules in `src/config/constants.js` in the `DISPUTE_RULES.NON_FRIVOLOUS_INDICATORS` section.

**Q: Can it run for multiple clients simultaneously?**
A: Yes, the automation processes all clients sequentially by default. You can also run it for a specific client using `--client=ClientName`.

**Q: How do I add a new client?**
A: Add the client credentials to the `eoscar_credentials` table in Supabase.

**Q: What if there's an error during processing?**
A: The automation will log the error, update the dispute status to 'Error', and continue with the next dispute.
