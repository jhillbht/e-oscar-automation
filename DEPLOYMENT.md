# E-Oscar Dispute Review Automation - Deployment Guide

This guide provides comprehensive instructions for deploying the E-Oscar Dispute Review Automation system, including the Supabase authentication components and Docker containers.

## System Overview

The E-Oscar Dispute Review Automation consists of several components:

1. **Supabase Backend**: Authentication system and database
2. **Docker Containers**: 
   - Dispute Review Automation (main automation container)
   - Report Processor (report download and processing)
3. **Web Application**: User interface for authentication and automation control

## Prerequisites

Before deployment, ensure the following prerequisites are met:

- Node.js 18+ installed
- Docker and Docker Compose installed
- Supabase CLI installed (`npm install -g supabase`)
- Access to the E-Oscar system
- Access to the df-disputes@array.com email
- Google Sheets containing login credentials
- Slack workspace for OTP delivery

## Step 1: Supabase Setup

### 1.1. Clone the Repository

```bash
git clone https://github.com/jhillbht/e-oscar-automation.git
cd e-oscar-automation
```

### 1.2. Configure Supabase Environment

Create a `.env` file in the `supabase/functions` directory:

```bash
cat > supabase/functions/.env << EOF
SUPABASE_URL=https://rbipwoarcmbqpeolyyzt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_SECRET=your-admin-secret
CRON_KEY=your-cron-function-key
INTERNAL_AUTH_PASSWORD=a-strong-internal-password-for-auth
SHEETS_API_ENDPOINT=https://your-google-sheets-api-middleware.com/api/sheets/read
SHEETS_API_KEY=your-sheets-api-key
EOF
```

### 1.3. Deploy Supabase Components

Run the deployment script:

```bash
chmod +x scripts/deploy-supabase-functions.sh
./scripts/deploy-supabase-functions.sh
```

This script will:
- Link to the Supabase project
- Apply database migrations
- Deploy Edge Functions
- Configure environment variables
- Set up the scheduled sync task

## Step 2: Docker Container Setup

### 2.1. Configure Docker Environment

Create a `.env` file in the project root:

```bash
cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=https://rbipwoarcmbqpeolyyzt.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# E-Oscar Configuration
EOSCAR_URL=https://www.e-oscar-web.net/

# Slack Configuration
SLACK_TOKEN=your-slack-bot-token
SLACK_OTP_CHANNEL=otp-test

# Google Sheets Configuration
GOOGLE_SHEETS_ID=1XrGspfqOI3mlkO-d_MIZYiEyyDHpZjaBqRWXlF6pIQU
GOOGLE_SHEETS_TAB_CREDENTIALS=Login Credentials
GOOGLE_SHEETS_TAB_IMPORTS=ClickUp Imports

# ClickUp Configuration
CLICKUP_API_TOKEN=your-clickup-api-token
CLICKUP_LIST_ID=your-clickup-list-id

# Logging Configuration
LOG_LEVEL=info
EOF
```

### 2.2. Create Component-Specific Environment Files

Create .env files for each component:

```bash
# For dispute review automation
cp .env e-oscar-automation-docker/.env

# For report processor
cp .env report-processor/.env
```

### 2.3. Build and Run Docker Containers

Deploy the containers using Docker Compose:

```bash
docker-compose up -d
```

This will start two containers:
- `e-oscar-dispute-review`: Main automation container
- `e-oscar-report-processor`: Report processing container

### 2.4. Verify Container Status

Check that the containers are running:

```bash
docker ps | grep e-oscar
```

## Step 3: Web Application Setup

### 3.1. Configure Web App Environment

Create a `.env` file in the `e-oscar-firebase-app` directory:

```bash
cat > e-oscar-firebase-app/.env << EOF
NEXT_PUBLIC_SUPABASE_URL=https://rbipwoarcmbqpeolyyzt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EOF
```

### 3.2. Install Dependencies

```bash
cd e-oscar-firebase-app
npm install
```

### 3.3. Build the Web Application

```bash
npm run build
```

### 3.4. Deploy to Web Server

Deploy the built application to your web server. For example, with Firebase:

```bash
firebase deploy
```

## Step 4: Testing the Deployment

### 4.1. Test Authentication

1. Navigate to your web application URL
2. Attempt to log in using E-Oscar credentials
3. Verify you can access the dashboard

### 4.2. Test Manual Automation Run

Run the automation manually to verify it works:

```bash
docker exec e-oscar-dispute-review node src/index.js
```

### 4.3. Check Logs

Verify the logs show successful execution:

```bash
docker logs e-oscar-dispute-review
```

## Step 5: Configure Scheduled Execution

### 5.1. Set Up Daily Run

Create a cron job to run the automation daily:

```bash
# Create a cron file
cat > /etc/cron.d/e-oscar-automation << EOF
# Run E-Oscar dispute review automation daily at 9:00 AM
0 9 * * * root docker restart e-oscar-dispute-review >> /var/log/e-oscar-cron.log 2>&1
EOF

# Set permissions
chmod 644 /etc/cron.d/e-oscar-automation
```

### 5.2. Special Monday Run

Configure a special run on Mondays to handle weekend disputes:

```bash
# Add to the cron file
cat >> /etc/cron.d/e-oscar-automation << EOF
# Additional run on Mondays at 9:15 AM to process weekend disputes
15 9 * * 1 root docker exec e-oscar-dispute-review node src/index.js --weekend >> /var/log/e-oscar-cron-monday.log 2>&1
EOF
```

## Monitoring and Maintenance

### Password Rotation

E-Oscar passwords expire every 30-60 days. Set up a recurring task to check for expiring passwords:

```bash
# Add to the cron file
cat >> /etc/cron.d/e-oscar-automation << EOF
# Check for expiring passwords daily at 8:00 AM
0 8 * * * root curl -X POST "https://rbipwoarcmbqpeolyyzt.supabase.co/functions/v1/check-passwords" -H "Content-Type: application/json" -H "x-function-key: $CRON_KEY" >> /var/log/e-oscar-password-check.log 2>&1
EOF
```

### Error Notifications

Set up Slack notifications for any automation failures:

```bash
# Add to your Slack alert script (scripts/notify-errors.sh)
if grep -q "ERROR" /var/log/e-oscar-cron.log; then
  curl -X POST "https://slack.com/api/chat.postMessage" \
    -H "Authorization: Bearer $SLACK_TOKEN" \
    -H "Content-type: application/json" \
    -d "{\"channel\":\"#automation-alerts\",\"text\":\"E-Oscar automation encountered errors. Please check logs.\"}"
fi
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check Supabase logs for authentication errors
   - Verify credentials in Google Sheets
   - Ensure the sync function is working properly

2. **OTP Issues**
   - Verify df-disputes@array.com is forwarding to Slack
   - Check Slack token and channel configuration
   - Test OTP extraction with a test case

3. **Docker Container Failures**
   - Check for memory or resource limitations
   - Verify network connectivity to E-Oscar
   - Check for database connection issues

### Accessing Logs

- **Container Logs**: `docker logs e-oscar-dispute-review`
- **Supabase Logs**: Check Supabase dashboard
- **Authentication Logs**: Query `eoscar_audit_log` table
- **Sync Logs**: Query `sync_logs` table

## Security Considerations

1. **Credential Management**
   - Passwords are hashed in the database
   - All access is logged for audit purposes
   - Row-level security restricts access to sensitive data

2. **Access Control**
   - Web application uses token-based authentication
   - Edge Functions require specific API keys
   - Docker containers run as non-root users

3. **Monitoring**
   - All authentication attempts are logged
   - Failed logins trigger alerts
   - Password expirations are monitored

## Additional Resources

- [E-Oscar Documentation](https://www.e-oscar-web.net/documentation)
- [Supabase Documentation](https://supabase.io/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Project GitHub Repository](https://github.com/jhillbht/e-oscar-automation)