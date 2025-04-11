# E-Oscar Dispute Review Automation

## Overview

This module automates the "Review and Categorize Disputes" step of the E-Oscar dispute handling process. It saves approximately 1 hour of developer time each day by automating the repetitive task of evaluating disputes as frivolous or non-frivolous based on specific criteria.

## Features

- Automated login to E-Oscar with OTP handling
- Case search by Control Number
- Intelligent dispute categorization based on business rules
- Automatic action execution based on categorization
- Integration with ClickUp for task management
- Comprehensive audit logging

## Business Rules for Categorization

Disputes are categorized as follows:

1. **Non-Frivolous** if any of these conditions are met:
   - Dispute Code 1 or Dispute Code 2 contains "103"
   - Images field has any value other than "--" or "0"
   - FCRA Relevant Information has any value other than "--"

2. **Frivolous**: All other cases

## Actions Taken

### For Non-Frivolous Disputes:
1. Copy the details of the indicator 
2. Add as a comment to the ClickUp ticket
3. Change ClickUp ticket status to "NEED TO ESCALATE"

### For Frivolous Disputes:
1. Close the case in E-Oscar by:
   - Clicking continue 3 times
   - Selecting "01 - Information accurate as of last submission. No changes."
   - Clicking Submit
   - Handling any errors by clicking "Clear Account Information" and resubmitting
2. Close the ClickUp ticket

## Installation

### Docker Installation

1. Clone this repository
2. Copy `.env.example` to `.env` and fill in your configuration
3. Build and run the container:
   ```
   docker-compose up -d
   ```

### Local Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your configuration
4. Run the application: `npm start`

## Usage

The automation can be run in several ways:

```bash
# Run the full automation
npm start

# Run as a scheduled job
node scripts/run-daily.js
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| SUPABASE_URL | Supabase URL for credential management |
| SUPABASE_KEY | Supabase service key |
| SLACK_TOKEN | Slack bot token for OTP retrieval |
| SLACK_OTP_CHANNEL | Slack channel where OTPs are posted |
| EOSCAR_URL | E-Oscar website URL |
| CLICKUP_API_TOKEN | ClickUp API token |
| CLICKUP_LIST_ID | ClickUp list ID for disputes |
| LOG_PATH | Path for logs |
| LOG_LEVEL | Logging level |
| ALERT_EMAIL | Email for alerts |

## Troubleshooting

### Common Issues

1. **OTP Retrieval Issues**: If the OTP isn't being retrieved from Slack, ensure:
   - The Slack bot has access to the OTP channel
   - The OTP format is recognizable (6-digit code)

2. **Browser Automation Issues**: If Puppeteer is failing to interact with E-Oscar:
   - Try running in non-headless mode for debugging
   - Check if selectors have changed on the E-Oscar website

3. **Authentication Issues**: If login fails:
   - Verify the credentials are correct
   - Check if the password has expired (they expire every 30-60 days)
