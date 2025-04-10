#!/bin/bash
# Setup script for E-Oscar Firebase Application

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}E-Oscar Automation Setup${NC}"
echo "================================"
echo ""

# Create required directories
echo -e "${YELLOW}Creating required directories...${NC}"
mkdir -p logs
mkdir -p gcp-credentials
mkdir -p public/assets

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Creating sample .env file...${NC}"
  cat > .env << EOL
# Slack Configuration
SLACK_TOKEN=your-slack-token
SLACK_OTP_CHANNEL=otp-test

# ClickUp Configuration
CLICKUP_API_TOKEN=your-clickup-token
CLICKUP_LIST_ID=your-clickup-list-id

# Google Sheets Configuration
GOOGLE_SHEETS_ID=1XrGspfqOI3mlkO-d_MIZYiEyyDHpZjaBqRWXlF6pIQU
GOOGLE_SHEETS_TAB_IMPORTS=ClickUp Imports
GOOGLE_SHEETS_TAB_CREDENTIALS=Login Credentials

# Email Configuration
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
ALERT_EMAIL=notifications@example.com

# Firebase Configuration
FIREBASE_TOKEN=your-firebase-token
EOL
  echo -e "${RED}Please edit the .env file with your actual configuration values${NC}"
fi

# Check for service account file
if [ ! -f gcp-credentials/service-account.json ]; then
  echo -e "${RED}Warning: GCP service account file not found!${NC}"
  echo -e "Please place your service account key at ${YELLOW}gcp-credentials/service-account.json${NC}"
fi

# Make scripts executable
echo -e "${YELLOW}Making scripts executable...${NC}"
chmod +x run.sh

# Install npm packages
echo -e "${YELLOW}Installing npm packages for Cloud Functions...${NC}"
cd functions
npm install

cd ..

# Ask if the user wants to start the application
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "To start the application, run: ./run.sh"
echo "or use Docker Compose: docker-compose up -d"

echo ""
read -p "Would you like to start the application now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Starting application...${NC}"
  
  if command -v docker-compose &> /dev/null; then
    docker-compose up -d
    echo -e "${GREEN}Application started!${NC}"
    echo "Access the web interface at: http://localhost:8080"
  else
    echo -e "${RED}Docker Compose not found.${NC}"
    echo "You can manually start the application using:"
    echo "  npm start"
    echo "or install Docker Compose and run:"
    echo "  docker-compose up -d"
  fi
fi
