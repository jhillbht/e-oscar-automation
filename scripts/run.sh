#!/bin/bash
# run.sh - Script to run the E-Oscar automation

# Set the working directory to the script location
cd "$(dirname "$0")/.."

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set default log directory if not in environment
LOG_DIR=${LOG_PATH:-./logs}
mkdir -p $LOG_DIR

# Log file with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/e-oscar-automation_$TIMESTAMP.log"

# Function to log messages to console and file
log() {
  local msg="[$(date +"%Y-%m-%d %H:%M:%S")] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

# Check if the script is being run on Monday to determine date range
if [ "$(date +%u)" -eq 1 ]; then
  log "INFO: Running on Monday, will process weekend disputes"
else
  log "INFO: Running normal daily processing"
fi

# Run the application with proper error handling
log "INFO: Starting E-Oscar automation..."
node src/index.js > >(tee -a "$LOG_FILE") 2> >(tee -a "$LOG_FILE" >&2)
exit_code=$?

if [ $exit_code -eq 0 ]; then
  log "INFO: E-Oscar automation completed successfully"
else
  log "ERROR: E-Oscar automation failed with exit code $exit_code"
  
  # Send alert if configured
  if [ ! -z "$ALERT_EMAIL" ]; then
    echo "E-Oscar automation failed with exit code $exit_code. Please check logs at $LOG_FILE" | mail -s "E-Oscar Automation Error" $ALERT_EMAIL
  fi
fi

# Clean up old logs (keep only last 7 days)
find $LOG_DIR -name "e-oscar-automation_*.log" -type f -mtime +7 -delete

exit $exit_code
