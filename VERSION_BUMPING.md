# Automatic Version Bumping Setup

This document explains the automatic version bumping system for the PonyFun project.

## How It Works

A Git pre-push hook has been installed that automatically:
1. Increments the patch version in `frontend/package.json` (e.g., 1.0.1 → 1.0.2)
2. Commits the version change
3. Proceeds with the push

## Installation

The hook is already installed at `.git/hooks/pre-push`. If you need to reinstall it:

```bash
cp pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Usage

Simply push as normal:

```bash
git push
```

The hook will automatically:
- Display current version
- Bump to new version
- Commit the change
- Push everything

## Manual Version Bumping

If you need to manually control the version:

```bash
cd frontend
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

## Bypassing the Hook

If you need to push without bumping the version:

```bash
git push --no-verify
```

## Files

- `pre-push.sh` - Source script (kept in repo for reference)
- `.git/hooks/pre-push` - Active hook (not tracked in git)
