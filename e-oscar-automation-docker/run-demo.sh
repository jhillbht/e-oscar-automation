#!/bin/bash
# Demo script for E-Oscar automation

echo "====================================================="
echo "  E-Oscar Dispute Review Automation Demo"
echo "====================================================="
echo
echo "This demo simulates the execution of the automation process."
echo "In production, this would run in a Docker container."
echo

# Create logs directory if it doesn't exist
mkdir -p logs

# Create a demo .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating demo .env file..."
  cp .env.example .env
  echo "DEMO_MODE=true" >> .env
fi

echo "Loading environment..."
source .env

echo
echo "Starting dispute review automation process..."
echo

# Simulate the automation process with a delay between messages
simulate() {
  echo "$1"
  sleep 1
}

# Display simulated logs
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Starting E-Oscar dispute review automation"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Starting E-Oscar dispute processing"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Found 3 pending disputes to process"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Processing 2 disputes for client: ClientA"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Retrieving credentials for client: ClientA"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Logging in to E-Oscar as user_ClientA"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Successfully logged in to E-Oscar as user_ClientA"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Processing dispute 12345678 for John Doe"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Navigated to https://www.e-oscar-web.net/oscar/case/search"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for selector: select[name=\"caseType\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Selected ACDV in select[name=\"caseType\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Typed \"12345678\" into input[name=\"caseNumber\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked: button[type=\"submit\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for navigation"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked: a.case-id-link, a[href*=\"case/view\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for selector: .case-details, #caseDetailsForm"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Categorizing dispute..."
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Case details extracted: {\"disputeCode1\":\"Code 103: Consumer states account information is not theirs\",\"disputeCode2\":null,\"images\":\"1\",\"fcraRelevantInfo\":\"--\"}"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Dispute categorized as NOT FRIVOLOUS: Dispute Code 1 contains \"103\""
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Handling non-frivolous case for dispute 12345678"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Successfully handled non-frivolous case for dispute 12345678"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Processing dispute 87654321 for Jane Smith"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Navigated to https://www.e-oscar-web.net/oscar/case/search"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for selector: select[name=\"caseType\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Selected ACDV in select[name=\"caseType\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Typed \"87654321\" into input[name=\"caseNumber\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked: button[type=\"submit\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for navigation"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked: a.case-id-link, a[href*=\"case/view\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for selector: .case-details, #caseDetailsForm"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Categorizing dispute..."
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Case details extracted: {\"disputeCode1\":null,\"disputeCode2\":null,\"images\":\"--\",\"fcraRelevantInfo\":\"--\"}"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Dispute categorized as FRIVOLOUS"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Handling frivolous case for dispute 87654321"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Closing case in E-Oscar..."
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked continue button (1/3)"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked continue button (2/3)"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked continue button (3/3)"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Selected '01 - Information accurate as of last submission. No changes.' in response code dropdown"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Case successfully closed in E-Oscar"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Successfully handled frivolous case for dispute 87654321"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Completed processing 2 disputes for client: ClientA"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Processing 1 disputes for client: ClientB"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Retrieving credentials for client: ClientB"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Logging in to E-Oscar as user_ClientB"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Successfully logged in to E-Oscar as user_ClientB"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Processing dispute 55555555 for Alex Johnson"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Navigated to https://www.e-oscar-web.net/oscar/case/search"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for selector: select[name=\"caseType\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Selected ACDV in select[name=\"caseType\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Typed \"55555555\" into input[name=\"caseNumber\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked: button[type=\"submit\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for navigation"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Clicked: a.case-id-link, a[href*=\"case/view\"]"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Waited for selector: .case-details, #caseDetailsForm"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Categorizing dispute..."
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Case details extracted: {\"disputeCode1\":null,\"disputeCode2\":null,\"images\":\"1\",\"fcraRelevantInfo\":\"--\"}"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Dispute categorized as NOT FRIVOLOUS: Images has value other than \"--\" or \"0\""
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Handling non-frivolous case for dispute 55555555"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Successfully handled non-frivolous case for dispute 55555555"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Completed processing 1 disputes for client: ClientB"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: Processed 3 disputes successfully"
simulate "$(date '+%Y-%m-%d %H:%M:%S') [INFO]: E-Oscar dispute review completed successfully"

echo
echo "====================================================="
echo "  Summary of Dispute Processing"
echo "====================================================="
echo
echo "Total disputes processed: 3"
echo "Frivolous disputes: 1"
echo "Non-frivolous disputes: 2"
echo
echo "ClientA: 2 disputes (1 frivolous, 1 non-frivolous)"
echo "ClientB: 1 dispute (0 frivolous, 1 non-frivolous)"
echo
echo "====================================================="
echo
echo "In a production environment, this automation would:"
echo "1. Update the dispute status in Supabase"
echo "2. Add comments to the ClickUp tickets"
echo "3. Update ClickUp ticket statuses"
echo
echo "Demo completed successfully!"
