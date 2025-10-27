# FoxesGear Version Management

## Overview

This document describes how FoxesGear manages versions, generates a changelog, creates Git tags, and pushes releases to GitHub.

We use conventional commits and the "standard-version" workflow to:
- Update `package.json` version
- Generate or update `CHANGELOG.md`
- Create a version commit and Git tag
- Push the commit and tag to GitHub

## Prerequisites

- Git is configured locally with access to the GitHub repository (`origin` remote set)
- Dependencies installed:

```bash
npm install
```

## Development

Start the dev server:

```bash
npm run dev
```

## Release Workflow

The repo provides release scripts powered by `standard-version`.

### First Release (initializes the changelog and tags)

```bash
npm run release:first
```

### Subsequent Releases

Choose the appropriate semantic bump:

```bash
# Bug fixes only
npm run release:patch

# Backwards‑compatible features
npm run release:minor

# Breaking changes
npm run release:major
```

Each command will:
- Update the version in `package.json`
- Generate/update `CHANGELOG.md`
- Create a version commit and Git tag
- Push the branch and tags to GitHub

If your CI/CD (e.g., Vercel) is connected to GitHub, pushing the tag/commit will trigger a new deployment.

## Conventional Commits

For best results, use Conventional Commits in your PRs and merges. Example prefixes:
- `fix:` bug fixes
- `feat:` new, backwards‑compatible features
- `perf:` performance improvements
- `refactor:` refactoring without behavior change
- `docs:` documentation updates
- `chore:` tooling and maintenance

Include `BREAKING CHANGE:` in the body when introducing breaking changes. `standard-version` will use these messages to categorize the changelog.

## Changelog Location

- Generated at `CHANGELOG.md` in the repo root.

## Troubleshooting

- Ensure `origin` is set and you have permission to push.
- If you started without prior tags, run `npm run release:first` once to initialize the changelog and tag history.