#!/bin/bash

# Test Docker Compose script for E-Oscar Dispute Review Automation

# Step 1: Set up test environment
echo "Setting up test environment..."
cp .env.test .env

# Step 2: Build and run the container in test mode
echo "Building and starting container in test mode..."
TEST_MODE=true docker-compose up --build -d

# Step 3: Show container logs
echo "Container logs:"
docker-compose logs

# Step 4: Check the logs directory
echo "Checking logs directory..."
ls -la logs/

# Step 5: Clean up
echo "Cleaning up..."
docker-compose down

echo "Test completed!"
