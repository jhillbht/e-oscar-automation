# E-Oscar Dispute Review Automation: Deployment Guide

This guide provides detailed instructions for deploying and running the E-Oscar Dispute Review Automation in various environments.

## Table of Contents

1. [Overview](#overview)
2. [Docker Deployment](#docker-deployment)
3. [Local Development](#local-development)
4. [AWS Deployment](#aws-deployment)
5. [Configuration Options](#configuration-options)
6. [Running the Demo](#running-the-demo)
7. [Troubleshooting](#troubleshooting)

## Overview

The E-Oscar Dispute Review Automation tool automates the categorization of disputes as frivolous or non-frivolous based on specific business rules and taking appropriate actions in both E-Oscar and ClickUp.

## Docker Deployment

This is the recommended deployment method for production environments as it provides isolation and consistent behavior across different systems.

### Prerequisites

- Docker and Docker Compose installed
- Access to E-Oscar system
- Supabase account for credential management
- Slack workspace for OTP retrieval
- ClickUp account with API access

### Steps

1. Clone this repository to your deployment environment:
   ```bash
   git clone https://github.com/array/e-oscar-automation.git
   cd e-oscar-automation-docker
   ```

2. Create and configure the `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials and settings
   ```

3. Build and run the Docker container:
   ```bash
   docker-compose up -d
   ```

4. Check the logs to ensure the container is running correctly:
   ```bash
   docker-compose logs -f
   ```

### Docker Resource Requirements

- CPU: 1 core minimum, 2 cores recommended
- Memory: 2GB minimum
- Disk: 1GB minimum

### Environment Variables for Docker

In addition to the standard environment variables, the following are specific to Docker deployment:

- `NODE_ENV=production`: Sets Node.js to production mode
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`: Path to Chromium inside the container

## Local Development

For development and testing purposes, you can run the automation locally without Docker.

### Prerequisites

- Node.js 18 or higher
- Chromium or Chrome browser installed
- npm or yarn package manager

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/array/e-oscar-automation.git
   cd e-oscar-automation-docker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create and configure the `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials and settings
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

## AWS Deployment

For deployment on AWS remote desktops, follow these additional steps:

### Prerequisites

- AWS remote desktop access
- Administrator privileges on the remote desktop

### Steps

1. Connect to your AWS remote desktop.

2. Install Docker on the remote desktop:
   ```bash
   # Update package lists
   sudo apt-get update

   # Install required packages
   sudo apt-get install -y \
       apt-transport-https \
       ca-certificates \
       curl \
       gnupg \
       lsb-release

   # Add Docker's official GPG key
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

   # Set up the stable repository
   echo \
     "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
     $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   # Install Docker
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

   # Add your user to the docker group
   sudo usermod -aG docker $USER
   ```

3. Log out and log back in for the group changes to take effect.

4. Follow the Docker deployment steps from the previous section.

## Configuration Options

### Required Configuration

These settings must be configured in the `.env` file:

- `SUPABASE_URL` and `SUPABASE_KEY`: For credential management
- `SLACK_TOKEN` and `SLACK_OTP_CHANNEL`: For OTP retrieval
- `CLICKUP_API_TOKEN` and `CLICKUP_LIST_ID`: For ClickUp integration

### Optional Configuration

- `LOG_PATH`: Path to store logs (default: ./logs)
- `LOG_LEVEL`: Logging level (default: info)
- `ALERT_EMAIL`: Email for alerts
- `PUPPETEER_ARGS`: Additional arguments for Puppeteer browser

## Running the Demo

For testing and demonstration purposes, a demo script is included:

```bash
./run-demo.sh
```

This script simulates the execution of the automation process, showing how it would handle disputes in a production environment. It's useful for:

- Training new team members
- Testing the workflow without connecting to production systems
- Verifying the business logic

## Troubleshooting

### Common Issues

#### Docker Container Fails to Start

Check the Docker logs:
```bash
docker logs e-oscar-dispute-review
```

Common causes:
- Invalid environment variables
- Insufficient system resources
- Missing network connectivity

#### OTP Retrieval Issues

- Verify the Slack token is correct
- Ensure the bot is in the OTP channel
- Check that OTPs are being forwarded correctly from df-disputes@array.com

#### Browser Automation Issues

If Puppeteer cannot interact with the E-Oscar website:
- Check if the site structure has changed
- Try running in non-headless mode for debugging
- Update selectors in the code if needed

#### Database Connection Issues

- Verify Supabase URL and API key
- Check network connectivity to Supabase
- Ensure the database tables exist and have the correct structure
