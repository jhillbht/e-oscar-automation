#!/bin/bash
# Script to deploy Supabase functions

# Set the working directory to the script location
cd "$(dirname "$0")/.."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI is not installed. Installing..."
  npm install -g supabase
  if [ $? -ne 0 ]; then
    echo "Failed to install Supabase CLI. Please install it manually."
    exit 1
  fi
fi

# Log in to Supabase (if not already logged in)
supabase login

# Link to the "Array" project
supabase link --project-ref rbipwoarcmbqpeolyyzt

# Apply migrations
echo "Applying database migrations..."
supabase migration up

# Deploy all functions
echo "Deploying Edge Functions..."
supabase functions deploy auth-login
supabase functions deploy sync-credentials
supabase functions deploy scheduled-sync

# Set up environment variables
echo "Setting up environment variables..."
supabase secrets set --env-file supabase/functions/.env

# Set up scheduled task for daily credential synchronization
echo "Setting up scheduled task for daily credential synchronization..."
supabase functions schedule create --schedule "0 0 * * *" --function-name scheduled-sync

echo "Deployment completed successfully!"
