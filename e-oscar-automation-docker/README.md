# E-Oscar Dispute Review Automation

This project automates the E-Oscar dispute review process, saving approximately 1 hour of developer time each day.

## Overview

The automation performs the following tasks:

1. Logs into E-Oscar with stored credentials
2. Handles OTP retrieval from a Slack channel
3. Searches for cases by Control Number
4. Categorizes disputes as frivolous or non-frivolous based on business rules
5. Takes appropriate actions in both E-Oscar and ClickUp

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- Slack bot for OTP retrieval
- Google Sheets MCP access
- ClickUp API access

## Configuration

Create a `.env` file with the required configuration:

```
# Supabase Configuration (Optional)
SUPABASE_URL=https://rbipwoarcmbqpeolyyzt.supabase.co
SUPABASE_KEY=your-supabase-service-key

# Slack Configuration
SLACK_TOKEN=your-slack-bot-token
SLACK_OTP_CHANNEL=otp-test
SLACK_ALERT_CHANNEL=automation-alerts

# E-Oscar Configuration
EOSCAR_URL=https://www.e-oscar-web.net/

# ClickUp Configuration
CLICKUP_API_TOKEN=your-clickup-api-token
CLICKUP_LIST_ID=your-clickup-list-id

# Google Sheets Configuration
GOOGLE_SHEETS_ID=1XrGspfqOI3mlkO-d_MIZYiEyyDHpZjaBqRWXlF6pIQU
GOOGLE_SHEETS_TAB_CREDENTIALS=Login Credentials
GOOGLE_SHEETS_TAB_IMPORTS=ClickUp Imports
GOOGLE_DRIVE_ACCESS_TOKEN=your-mcp-access-token

# Logging Configuration
LOG_LEVEL=info

# Email Notification
ALERT_EMAIL=team@array.com
```

## Installation

### Using Docker

1. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

2. Check container status:
   ```bash
   docker ps | grep e-oscar
   ```

### Manual Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   node src/index.js
   ```

## Usage

### Running the Automation

The automation can be run in several ways:

1. Using the run script:
   ```bash
   ./run.sh
   ```

2. For a specific client:
   ```bash
   ./run.sh ClientName
   ```

3. Directly via Docker:
   ```bash
   docker restart e-oscar-dispute-review
   ```

4. Scheduled via cron:
   ```cron
   # Run daily at 9:00 AM
   0 9 * * * cd /path/to/e-oscar-automation && ./run.sh
   
   # Run Monday-specific processing at 9:15 AM
   15 9 * * 1 cd /path/to/e-oscar-automation && ./run.sh
   ```

### Monitoring

View logs:
```bash
docker logs -f e-oscar-dispute-review
```

View log files:
```bash
ls -la logs/
cat logs/e-oscar-$(date +"%Y-%m-%d").log
```

## Business Rules

Disputes are categorized as follows:

- **Non-Frivolous** if any of these conditions are met:
  - Dispute Code 1 or 2 contains "103"
  - Images field has any value other than "--" or "0"
  - FCRA Relevant Information has any value other than "--"
- **Frivolous**: All other cases

### Actions Taken

For **Non-Frivolous Disputes**:
- Copy the indicator details
- Add comment to ClickUp ticket
- Change status to "NEED TO ESCALATE"

For **Frivolous Disputes**:
- Close the case in E-Oscar
- Close the ClickUp ticket

## Fallback Mechanisms

The system has several fallback mechanisms:

1. **Supabase/Google Sheets**: If Supabase is not configured, the system falls back to Google Sheets for credential and dispute management.

2. **OTP Handling**: If Slack integration is not available, the system uses a mock OTP for demonstration purposes.

3. **Error Recovery**: The system logs errors comprehensively and continues processing other disputes if one fails.

## Maintenance

### Password Management

E-Oscar passwords expire every 30-60 days:

1. Update the password in E-Oscar
2. Update the Google Sheet or Supabase credentials
3. Verify by running a test login

### Troubleshooting

Common issues:

1. **OTP Retrieval Failure**
   - Check Slack token validity
   - Verify email forwarding setup
   - Ensure bot is in the OTP channel

2. **Browser Automation Issues**
   - Check for E-Oscar site changes
   - Update selectors if needed
   - Run in non-headless mode for debugging

## Contact

For questions or support, contact the Development Team.
