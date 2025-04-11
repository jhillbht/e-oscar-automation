# E-Oscar Authentication System

This directory contains the Supabase Edge Functions and database migration files for the E-Oscar Dispute Review Automation authentication system. The authentication system provides secure access to E-Oscar credentials using the Google Sheets integration.

## Overview

The authentication system consists of several components:

- **Database Schema**: Tables for storing credentials, audit logs, and sync logs
- **Edge Functions**: Serverless functions for authentication and credential management
- **Web Application Integration**: React components for login and authentication
- **Docker Integration**: Integration with the E-Oscar automation Docker container

## Directory Structure

```
supabase/
├── functions/             # Edge Functions
│   ├── auth-login/        # Authentication login function
│   ├── sync-credentials/  # Credential sync function
│   ├── scheduled-sync/    # Scheduled sync function
│   └── .env               # Environment variables
└── migrations/            # Database migrations
    └── create_auth_tables.sql
```

## Setup Instructions

### 1. Database Setup

The database schema is set up using the migration file in the `migrations` directory. It creates the following tables:

- `authorized_users`: Stores user credentials synced from Google Sheets
- `sync_logs`: Tracks credential synchronization activities
- `eoscar_audit_log`: Logs all authentication and credential operations

To apply the migrations:

```bash
supabase migration up
```

### 2. Edge Functions

The authentication system includes three Edge Functions:

- **auth-login**: Authenticates users against the credentials stored in the database
- **sync-credentials**: Syncs credentials from the Google Sheets
- **scheduled-sync**: Scheduled function that runs daily to keep credentials in sync

To deploy the Edge Functions:

```bash
supabase functions deploy auth-login
supabase functions deploy sync-credentials
supabase functions deploy scheduled-sync
```

### 3. Environment Configuration

Create a `.env` file in the `functions` directory with the following variables:

```
SUPABASE_URL=https://rbipwoarcmbqpeolyyzt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
ADMIN_SECRET=[your-admin-secret]
CRON_KEY=[your-cron-function-key]
INTERNAL_AUTH_PASSWORD=[a-strong-internal-password]
SHEETS_API_ENDPOINT=[your-sheets-api-endpoint]
SHEETS_API_KEY=[your-sheets-api-key]
```

Apply these environment variables:

```bash
supabase secrets set --env-file functions/.env
```

### 4. Scheduled Sync

To set up the scheduled credential sync (runs daily at midnight):

```bash
supabase functions schedule create \
  --schedule '0 0 * * *' \
  --function-name scheduled-sync
```

## Docker Integration

The E-Oscar automation Docker container has been updated to integrate with the authentication system:

1. The `credentials.js` module now retrieves credentials from Supabase
2. The `login.js` module logs authentication events to the audit log
3. The dispute processor now uses the Supabase service for database operations

## Web Application Integration

The React components for the frontend authentication system are located in the `e-oscar-firebase-app` directory:

- `src/services/auth.js`: Authentication service for interaction with Supabase
- `src/context/AuthProvider.jsx`: Context provider for authentication state
- `src/components/ProtectedRoute.jsx`: Route component for protected pages
- `src/pages/Login.jsx`: Login page with E-Oscar credential authentication
- `src/pages/Dashboard.jsx`: Dashboard page showing authenticated user info

## Testing

### Testing Authentication

To test the authentication function:

```bash
curl -X POST "https://rbipwoarcmbqpeolyyzt.supabase.co/functions/v1/auth-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"BrigitArrayJH","password":"qfx0kdh6CBV.dmu3vuv"}'
```

### Testing Credential Sync

To manually trigger a credential sync:

```bash
curl -X POST "https://rbipwoarcmbqpeolyyzt.supabase.co/functions/v1/sync-credentials" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret"
```

## Maintenance

### Monitoring Password Expirations

E-Oscar passwords expire every 30-60 days. To check for passwords that will expire soon:

```sql
SELECT * FROM check_password_expirations(7);
```

This will return credentials that will expire within the next 7 days.

### Viewing Audit Logs

To view recent authentication activities:

```sql
SELECT * FROM eoscar_audit_log ORDER BY created_at DESC LIMIT 10;
```

### Updating Passwords

When an E-Oscar password changes, update it in the database:

```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

await supabase
  .from('eoscar_credentials')
  .update({ password: newPassword })
  .eq('username', username)
  .eq('client_name', clientName);
```

## Security Considerations

1. **Row-Level Security**: All tables have RLS enabled to protect sensitive data
2. **Password Hashing**: Passwords are hashed with bcrypt before storage
3. **Audit Logging**: All access and changes are tracked for security compliance
4. **Service Role**: Only authenticated services can access credentials

## Troubleshooting

- **Login Failures**: Check `eoscar_audit_log` for error details
- **Sync Issues**: Review `sync_logs` for synchronization failures
- **Password Errors**: E-Oscar passwords expire every 30-60 days, check for expired credentials