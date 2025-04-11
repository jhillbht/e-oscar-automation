# E-Oscar Automation - Maintenance Guide

This guide covers routine maintenance tasks for the E-Oscar Dispute Review Automation system.

## Password Management

### Checking for Expiring Passwords

E-Oscar passwords expire every 30-60 days. To check for passwords that will expire soon:

```bash
# Using Supabase CLI
supabase db query "SELECT * FROM check_password_expirations(7)"
```

This will show credentials that will expire within the next 7 days.

### Updating Passwords

When an E-Oscar password changes, update it in the system:

1. **Option 1: Update in Google Sheets**
   - Update the password in the Google Sheets document
   - The automatic sync will update the database (runs daily at midnight)
   - For immediate update, trigger a manual sync

2. **Option 2: Direct Update in Database**
   ```bash
   # Using Supabase CLI
   supabase db query "
   UPDATE eoscar_credentials 
   SET password = 'new-password' 
   WHERE username = 'username' AND client_name = 'client-name'
   "
   ```

3. **Option 3: Using the Node.js API**
   ```javascript
   const { updatePassword } = require('./modules/auth/credentials');
   
   await updatePassword('ClientName', 'username', 'new-password');
   ```

### Triggering Manual Credential Sync

To manually trigger a sync with Google Sheets:

```bash
curl -X POST "https://rbipwoarcmbqpeolyyzt.supabase.co/functions/v1/sync-credentials" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret"
```

## Monitoring

### Viewing Audit Logs

To view authentication and credential access events:

```bash
# Using Supabase CLI
supabase db query "
SELECT 
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
  action_type,
  action_details->'username' as username,
  performed_by
FROM eoscar_audit_log
ORDER BY created_at DESC
LIMIT 20
"
```

### Monitoring Sync Events

To view credential synchronization events:

```bash
# Using Supabase CLI
supabase db query "
SELECT 
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
  type,
  status,
  details->'new_users' as new_users,
  details->'updated_users' as updated_users
FROM sync_logs
ORDER BY created_at DESC
LIMIT 10
"
```

### Checking for Failed Logins

To monitor for failed login attempts:

```bash
# Using Supabase CLI
supabase db query "
SELECT 
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as timestamp,
  action_details->'username' as username,
  action_details->'error' as error
FROM eoscar_audit_log
WHERE action_type = 'login_failure'
ORDER BY created_at DESC
LIMIT 10
"
```

## Docker Container Maintenance

### Checking Container Status

```bash
docker ps | grep e-oscar
```

### Viewing Container Logs

```bash
docker logs e-oscar-dispute-review --tail 100
```

### Restarting Containers

```bash
docker restart e-oscar-dispute-review
docker restart e-oscar-report-processor
```

### Updating Container Images

```bash
docker-compose pull
docker-compose up -d
```

## Database Maintenance

### Backup Configuration

Create daily backups of the Supabase database:

```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql
```

Add to crontab:

```
0 1 * * * cd /path/to/project && supabase db dump -f backups/backup_$(date +%Y%m%d).sql
```

### Database Cleanup

Periodically clean up old logs:

```sql
-- Delete audit logs older than 90 days
DELETE FROM eoscar_audit_log WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete sync logs older than 30 days
DELETE FROM sync_logs WHERE created_at < NOW() - INTERVAL '30 days';
```

## Web Application Maintenance

### Checking Authentication Status

To check if users are successfully authenticating:

```bash
# Using Supabase CLI
supabase db query "
SELECT 
  COUNT(*) as login_count,
  TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as day
FROM eoscar_audit_log
WHERE action_type = 'login_success'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC
LIMIT 7
"
```

### Updating Environment Variables

If you need to update environment variables for the web application:

1. Update the `.env` file
2. Rebuild the application: `npm run build`
3. Redeploy the application

## Scheduling Maintenance

### Viewing Current Schedule

To see currently scheduled tasks:

```bash
supabase functions schedule list
```

### Updating Schedule

To update the schedule for the credential sync:

```bash
# Remove existing schedule
supabase functions schedule delete scheduled-sync

# Create new schedule (e.g., run twice daily)
supabase functions schedule create \
  --schedule "0 0,12 * * *" \
  --function-name scheduled-sync
```

## Troubleshooting Common Issues

### Authentication Failures

If users can't authenticate:

1. Check if the credentials are correctly synced in the database
2. Verify the auth-login function is deployed and accessible
3. Check the browser console for JavaScript errors
4. Review the eoscar_audit_log for specific error messages

### Sync Failures

If credential synchronization fails:

1. Check if the Google Sheets API endpoint is accessible
2. Verify the API key is valid
3. Check that the Google Sheet has the expected structure
4. Review the sync_logs table for specific error messages

### Container Crashes

If a container crashes:

1. Check logs for Out-of-Memory errors
2. Verify network connectivity to external services
3. Check for browser automation errors in Puppeteer
4. Ensure the container has the necessary environment variables

## Emergency Procedures

### Manual Dispute Processing

If the automation fails, follow these steps for manual processing:

1. Log in to E-Oscar directly with your credentials
2. Perform the manual review process as documented
3. Update the tickets in ClickUp manually

### Restoring Database from Backup

To restore the database from a backup:

```bash
supabase db restore backups/backup_YYYYMMDD.sql
```

### Emergency Contact List

For critical issues, contact:

- Primary Contact: [Developer Name] - [Phone Number]
- Secondary Contact: [Manager Name] - [Phone Number]
- E-Oscar Support: [Support Email/Phone]