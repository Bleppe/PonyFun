#!/bin/bash

# PonyFun Docker Deployment Script
# This script ensures a fresh build and deployment

set -e  # Exit on error

echo "🏴‍☠️ PonyFun Deployment Script 🦄"
echo "=================================="
echo ""

# Get current git commit
GIT_HASH=$(git rev-parse --short HEAD)
echo "📦 Current commit: $GIT_HASH"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images (optional - uncomment for complete rebuild)
# echo "🗑️  Removing old images..."
# docker-compose down --rmi all

# Build without cache
echo "🔨 Building fresh images (no cache)..."
docker-compose build --no-cache --pull

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
echo ""
echo "✅ Deployment Status:"
docker-compose ps

echo ""
echo "🎉 Deployment complete!"
echo "📍 Frontend: http://localhost:4201"
echo "📍 Backend:  http://localhost:3005"
echo "🔖 Version:  v$GIT_HASH"
echo ""
echo "💡 Check the version in the bottom left corner of the app to verify deployment!"
