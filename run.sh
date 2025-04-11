#!/bin/bash
# Run script for E-Oscar Firebase Application

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}E-Oscar Automation${NC}"
echo "===================="
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo -e "${RED}Error: .env file not found!${NC}"
  echo "Please run ./setup.sh first"
  exit 1
fi

# Check for service account file
if [ ! -f gcp-credentials/service-account.json ]; then
  echo -e "${RED}Error: GCP service account file not found!${NC}"
  echo -e "Please place your service account key at ${YELLOW}gcp-credentials/service-account.json${NC}"
  exit 1
fi

# Function to show menu
show_menu() {
  echo "Choose an operation:"
  echo "1) Run with Docker Compose"
  echo "2) Run Firebase Emulators"
  echo "3) Deploy to Firebase"
  echo "4) Stop all containers"
  echo "5) View logs"
  echo "6) Exit"
  echo ""
  read -p "Enter your choice [1-6]: " choice
}

# Function to run with Docker Compose
run_docker() {
  echo -e "${YELLOW}Starting application with Docker Compose...${NC}"
  
  if command -v docker-compose &> /dev/null; then
    docker-compose up -d
    echo -e "${GREEN}Application started!${NC}"
    echo "Access the web interface at: http://localhost:8080"
  else
    echo -e "${RED}Docker Compose not found.${NC}"
    echo "Please install Docker Compose and try again."
  fi
}

# Function to run Firebase emulators
run_emulators() {
  echo -e "${YELLOW}Starting Firebase emulators...${NC}"
  
  if command -v firebase &> /dev/null; then
    firebase emulators:start
  else
    echo -e "${RED}Firebase CLI not found.${NC}"
    echo "Please install Firebase CLI with: npm install -g firebase-tools"
  fi
}

# Function to deploy to Firebase
deploy_firebase() {
  echo -e "${YELLOW}Deploying to Firebase...${NC}"
  
  if command -v firebase &> /dev/null; then
    firebase deploy
  else
    echo -e "${RED}Firebase CLI not found.${NC}"
    echo "Please install Firebase CLI with: npm install -g firebase-tools"
  fi
}

# Function to stop containers
stop_containers() {
  echo -e "${YELLOW}Stopping all containers...${NC}"
  
  if command -v docker-compose &> /dev/null; then
    docker-compose down
    echo -e "${GREEN}All containers stopped.${NC}"
  else
    echo -e "${RED}Docker Compose not found.${NC}"
    echo "Please install Docker Compose and try again."
  fi
}

# Function to view logs
view_logs() {
  echo -e "${YELLOW}Viewing application logs...${NC}"
  
  if command -v docker &> /dev/null; then
    docker logs e-oscar-firebase-app -f
  else
    echo -e "${RED}Docker not found.${NC}"
    echo "Please install Docker and try again."
  fi
}

# Main menu loop
while true; do
  show_menu
  
  case $choice in
    1) run_docker ;;
    2) run_emulators ;;
    3) deploy_firebase ;;
    4) stop_containers ;;
    5) view_logs ;;
    6) 
      echo -e "${GREEN}Goodbye!${NC}"
      exit 0 
      ;;
    *)
      echo -e "${RED}Invalid choice. Please try again.${NC}"
      ;;
  esac
  
  echo ""
  read -p "Press Enter to continue..."
  clear
done
