#!/bin/bash

# Simple test script for E-Oscar Dispute Review Automation

echo "Starting simple Docker test..."

# Build the Docker image
echo "Building Docker image..."
docker build -t e-oscar-test .

# Run the container in test mode
echo "Running the container in test mode..."
docker run --name e-oscar-test \
  -e NODE_ENV=development \
  -e TEST_MODE=true \
  -v "$(pwd)/logs:/app/logs" \
  e-oscar-test

# Display logs
echo "Container logs:"
docker logs e-oscar-test

# Check the logs directory
echo "Checking logs directory..."
ls -la logs/

# Clean up
echo "Cleaning up..."
docker rm e-oscar-test

echo "Test completed!"
