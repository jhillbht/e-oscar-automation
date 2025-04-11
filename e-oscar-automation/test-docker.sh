#!/bin/bash

# Test Docker script for E-Oscar Dispute Review Automation

# Step 1: Set up test environment
echo "Setting up test environment..."
cp .env.test .env

# Step 2: Build the Docker image
echo "Building Docker image..."
docker build -t e-oscar-dispute-review-test .

# Step 3: Run the container in test mode
echo "Running the container in test mode..."
docker run --name e-oscar-test \
  -e NODE_ENV=development \
  -e TEST_MODE=true \
  -v "$(pwd)/logs:/app/logs" \
  e-oscar-dispute-review-test

# Step 4: Check the logs
echo "Checking logs..."
ls -la logs/

# Step 5: Clean up
echo "Cleaning up..."
docker rm e-oscar-test

echo "Test completed!"
