# Docker Build and Deployment Guide

## Problem: Stale Docker Builds

If you're seeing old versions of the app after building with Docker, it's because Docker is using cached layers.

## Solution 1: Force Rebuild (Recommended for Development)

Use the `--no-cache` flag to force a complete rebuild:

```bash
# Stop and remove existing containers
docker-compose down

# Build without cache
docker-compose build --no-cache

# Start the services
docker-compose up -d
```

## Solution 2: Rebuild Specific Service

If only one service needs rebuilding:

```bash
# Rebuild just the frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Or rebuild just the backend
docker-compose build --no-cache backend
docker-compose up -d backend
```

## Solution 3: Complete Clean Rebuild

For a completely fresh start:

```bash
# Stop and remove containers, networks, and images
docker-compose down --rmi all

# Rebuild everything
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

## Solution 4: One-Command Rebuild

```bash
# Stop, rebuild without cache, and restart
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

## Verify the Version

After rebuilding, check the version in the bottom left corner of the app at http://your-server:4201

The version is read from `frontend/package.json`. You can verify the current version with:

```bash
grep '"version"' frontend/package.json
```

To update the version, edit `frontend/package.json` or use npm:

```bash
cd frontend
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## Why This Happens

Docker caches build layers to speed up builds. When you make code changes:
- Docker may reuse cached layers if it doesn't detect changes
- The `COPY . .` step might use a cached layer
- Version numbers come from `package.json`, not git

## Updated docker-compose.yml

The docker-compose.yml has been updated with:
- `pull: true` - Always pull latest base images
- `image:` tags - Explicitly name images for easier management
- Proper build context configuration

## Best Practice for Production

For production deployments, always use:
```bash
docker-compose build --no-cache && docker-compose up -d
```

This ensures you're deploying the exact code from your repository.
