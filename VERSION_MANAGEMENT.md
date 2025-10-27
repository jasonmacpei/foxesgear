# Basketball Practice Planner

## Introduction

Basketball Practice Planner is a tool to help coaches design and manage basketball practice sessions efficiently.

## Features

- Create and save practice plans
- Share practice plans with team members
- Track player progress over time

## Installation

Run the following command to install the dependencies:

```bash
npm install
```

## Development

To start the development server, run:

```bash
npm run dev
```

## Releases & Deploys

Version management is handled via scripts that update the version, commit changes, and trigger deployments. See [VERSION_MANAGEMENT.md](project_docs/deployment/VERSION_MANAGEMENT.md) for details.

### Quick Usage Example

To bump a version and trigger a Vercel deployment:

```bash
# For a minor release (new features, backwards compatible)
npm run version:minor

# For a patch release (bug fixes only)
npm run version:patch

# For a major release (breaking changes)
npm run version:major
```

This will:
- Update package.json, version.ts, and version display component
- Commit changes and create a Git tag
- Push branch and tag atomically to avoid duplicate Vercel builds
- Trigger a new Vercel deployment with the updated version visible in the UI