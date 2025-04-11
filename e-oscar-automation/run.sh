#!/bin/bash
# E-Oscar Dispute Review Automation - Run Script

# Set the working directory to the script location
cd "$(dirname "$0")"

# Set default environment if not specified
NODE_ENV=${NODE_ENV:-production}

# Load appropriate .env file based on environment
if [ "$NODE_ENV" = "development" ]; then
  ENV_FILE=.env.dev
else
  ENV_FILE=.env
fi

# Load environment variables if env file exists
if [ -f $ENV_FILE ]; then
  export $(grep -v '^#' $ENV_FILE | xargs)
  echo "Loaded environment from $ENV_FILE"
else
  echo "Warning: $ENV_FILE not found"
fi

# Set default log directory if not in environment
LOG_DIR=${LOG_PATH:-./logs}
mkdir -p $LOG_DIR

# Log file with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/e-oscar-automation_$TIMESTAMP.log"

# Create downloads directory if it doesn't exist
mkdir -p ./downloads

# Function to log messages to console and file
log() {
  local msg="[$(date +"%Y-%m-%d %H:%M:%S")] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

# Check if the script is being run on Monday to determine date range
if [ "$(date +%u)" -eq 1 ]; then
  log "INFO: Running on Monday, will process weekend disputes (Friday-Sunday)"
  WEEKEND_FLAG="--weekend"
else
  log "INFO: Running normal daily processing"
  WEEKEND_FLAG=""
fi

# Check if specific client was provided
if [ ! -z "$1" ]; then
  CLIENT_FLAG="--client=$1"
  log "INFO: Processing for specific client: $1"
else
  CLIENT_FLAG=""
  log "INFO: Processing for all clients"
fi

# Run the application with proper error handling
log "INFO: Starting E-Oscar automation in $NODE_ENV mode..."
node src/index.js $WEEKEND_FLAG $CLIENT_FLAG > >(tee -a "$LOG_FILE") 2> >(tee -a "$LOG_FILE" >&2)
exit_code=$?

if [ $exit_code -eq 0 ]; then
  log "INFO: E-Oscar automation completed successfully"
else
  log "ERROR: E-Oscar automation failed with exit code $exit_code"
  
  # Send alert if configured
  if [ ! -z "$ALERT_EMAIL" ]; then
    echo "E-Oscar automation failed with exit code $exit_code. Please check logs at $LOG_FILE" | mail -s "E-Oscar Automation Error" $ALERT_EMAIL
    log "INFO: Alert email sent to $ALERT_EMAIL"
  fi
  
  # Send Slack notification if configured
  if [ ! -z "$SLACK_TOKEN" ] && [ ! -z "$SLACK_ALERT_CHANNEL" ]; then
    curl -X POST -H "Authorization: Bearer $SLACK_TOKEN" \
         -H "Content-Type: application/json" \
         --data "{\"channel\":\"$SLACK_ALERT_CHANNEL\",\"text\":\"E-Oscar automation failed with exit code $exit_code. Please check logs.\"}" \
         https://slack.com/api/chat.postMessage
    log "INFO: Alert notification sent to Slack channel $SLACK_ALERT_CHANNEL"
  fi
fi

# Clean up old logs (keep only last 14 days)
find $LOG_DIR -name "e-oscar-automation_*.log" -type f -mtime +14 -delete
log "INFO: Cleaned up logs older than 14 days"

exit $exit_code