#!/bin/bash

# Pre-push hook to automatically bump version number
# This hook runs before every git push

echo "🔖 Auto-bumping version number..."

# Navigate to frontend directory
cd frontend || exit 1

# Get current version
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
echo "📦 Current version: $CURRENT_VERSION"

# Bump patch version using npm
npm version patch --no-git-tag-version > /dev/null 2>&1

# Get new version
NEW_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
echo "📦 New version: $NEW_VERSION"

# Go back to root
cd ..

# Add the updated package.json
git add frontend/package.json

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "✅ Version already up to date"
else
    # Commit the version bump
    git commit -m "chore: bump version to $NEW_VERSION" --no-verify
    echo "✅ Version bumped and committed"
fi

# Allow the push to continue
exit 0
