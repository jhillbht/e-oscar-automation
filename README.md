# E-Oscar Automation Project

This project automates the full E-Oscar dispute handling workflow, saving approximately 1 hour of developer time each day. The automation is split into modular components, each handling a specific part of the workflow:

## Project Components

### 1. Authentication System (`./supabase`)
- Secures access to E-Oscar credentials
- Integrates with Google Sheets for credential management
- Provides secure login for web application
- Handles password expiration and rotation
- Maintains comprehensive audit trail

### 2. Report Download and Processing (`./report-processor`)
- Downloads disputes from E-Oscar
- Processes and cleans the data
- Combines data into the ClickUp imports sheet
- Handles multi-client reports

### 3. Dispute Review Automation (`./e-oscar-automation`)
- Automates the "Review and Categorize Disputes" step
- Implements business rules for categorization
- Takes appropriate actions for frivolous/non-frivolous disputes
- Integrates with ClickUp for ticket management

### 4. Web Application (`./e-oscar-firebase-app`)
- Provides a user-friendly interface for the automation
- Allows authenticated access to dispute processing
- Displays automation status and results
- Enables manual runs of the automation

### 5. ClickUp Integration (planned)
- Handles ClickUp ticket creation and management
- Synchronizes dispute status with E-Oscar
- Provides a unified view of disputes

## System Architecture

The E-Oscar Automation uses a hybrid architecture combining:
- **Supabase**: For authentication, database, and Edge Functions
- **Docker Containers**: For automation components with browser automation requirements
- **Web Application**: For user interface and control

Each component runs in its own Docker container, allowing for:
- Independent scaling
- Isolated dependencies
- Simplified deployment
- Improved fault tolerance

The components share a common network and can be run individually or together using Docker Compose.

## Getting Started

1. Clone this repository
   ```
   git clone https://github.com/jhillbht/e-oscar-automation.git
   cd e-oscar-automation
   ```

2. Set up the authentication system
   ```
   cd supabase
   # Follow instructions in supabase/README.md
   ```

3. Copy `.env.example` to `.env` in each component directory
   ```
   cp .env.example .env
   cp .env.example e-oscar-automation/.env
   cp .env.example report-processor/.env
   cp .env.example e-oscar-firebase-app/.env
   ```

4. Configure each component according to its README

5. Deploy the Supabase functions
   ```
   chmod +x scripts/deploy-supabase-functions.sh
   ./scripts/deploy-supabase-functions.sh
   ```

6. Start the Docker containers
   ```
   docker-compose up -d
   ```

## Component Documentation

Each component has its own documentation:

- Authentication System: [./supabase/README.md](./supabase/README.md)
- Report Processor: [./report-processor/README.md](./report-processor/README.md)
- Dispute Review: [./e-oscar-automation/README.md](./e-oscar-automation/README.md)
- Web Application: [./e-oscar-firebase-app/README.md](./e-oscar-firebase-app/README.md)

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Development and Testing

For development and testing, you can run components in non-production mode:

```
# Run dispute review component in development mode
cd e-oscar-automation
npm install
npm run dev

# Run web application in development mode
cd e-oscar-firebase-app
npm install
npm run dev
```

### Testing Authentication

You can test the authentication system independently:

```
# Test login with E-Oscar credentials
curl -X POST "https://rbipwoarcmbqpeolyyzt.supabase.co/functions/v1/auth-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"BrigitArrayJH","password":"qfx0kdh6CBV.dmu3vuv"}'
```

## Maintenance

The authentication system includes tools for ongoing maintenance:

- **Password Rotation**: Monitors for expiring E-Oscar passwords
- **Audit Logging**: Tracks all authentication attempts
- **Credential Sync**: Keeps credentials in sync with Google Sheets

For detailed maintenance instructions, see [MAINTENANCE.md](./MAINTENANCE.md).

## Maintainers

This project is maintained by the Array development team.
