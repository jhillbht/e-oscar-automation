#!/bin/bash
# Script to push the E-Oscar Automation implementation to GitHub

# Set the working directory to the script location
cd "$(dirname "$0")/.."

# Set default values
REPO_URL="https://github.com/jhillbht/e-oscar-automation.git"
BRANCH="main"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)
      REPO_URL="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "Error: git is not installed. Please install git and try again."
  exit 1
fi

# Check if the directory is already a git repository
if [ -d ".git" ]; then
  echo "This directory is already a git repository."
  
  # Confirm with the user
  read -p "Do you want to continue with the existing repository? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
  fi
  
  # Check if remote already exists
  if git remote | grep -q "origin"; then
    echo "Remote 'origin' already exists."
    
    # Confirm with the user
    read -p "Do you want to update the remote URL to $REPO_URL? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git remote set-url origin "$REPO_URL"
      echo "Remote URL updated to $REPO_URL."
    fi
  else
    # Add remote
    git remote add origin "$REPO_URL"
    echo "Added remote 'origin' with URL $REPO_URL."
  fi
else
  # Initialize a new git repository
  echo "Initializing a new git repository..."
  git init
  
  # Add remote
  git remote add origin "$REPO_URL"
  echo "Added remote 'origin' with URL $REPO_URL."
fi

# Add all files to staging
echo "Adding files to staging..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "Implement E-Oscar Authentication System"

# Check if the branch exists
if git show-ref --quiet "refs/heads/$BRANCH"; then
  echo "Branch $BRANCH already exists."
else
  # Create the branch
  echo "Creating branch $BRANCH..."
  git checkout -b "$BRANCH"
fi

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin "$BRANCH"

echo "Successfully pushed E-Oscar Authentication System to GitHub!"
echo "Repository: $REPO_URL"
echo "Branch: $BRANCH"
