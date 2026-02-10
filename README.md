# 📄 docs-sentinel 🐶

Keep your AI context docs (`./docs/`) in sync with source code — so AI coding tools always work with accurate, up-to-date context.

![banner-docs-sentinel-compressed](https://github.com/user-attachments/assets/6710fa58-dfe5-47c5-b4af-e827df63cf3a)


docs-sentinel scans the markdown files that AI tools like Claude Code and Cursor rely on for project context, extracts source file references, and warns you when those files change — so your AI docs never silently go stale.

## Features

- **Reference extraction** — Detects source file paths referenced in your AI docs (backtick-wrapped, bare paths, markdown links)
- **Frontmatter management** — Adds YAML frontmatter with status, category, references, and verification date to each doc
- **Staleness detection** — Uses git history to flag AI docs whose referenced source files have changed
- **Health audit** — Computes a health score (0–100) across your AI docs for CI gating
- **Tool integrations** — Plugs directly into Claude Code hooks, Cursor rules, and VS Code tasks
- **Language-agnostic** — Works with any codebase (JS/TS, Go, Rust, Python, Ruby, PHP, etc.)

## Installation

```bash
# Run directly with npx (no install needed)
npx docs-sentinel init

# Or install as a dev dependency
npm install -D docs-sentinel
```

## Quick Start

```bash
# In your project root (must have a ./docs/ directory with AI context files)
npx docs-sentinel init

# Check which AI docs reference a changed source file
npx docs-sentinel check --file src/auth/auth.service.ts

# Audit the health of your AI docs
npx docs-sentinel audit
```

## Commands

### `init`

Scans your AI docs, adds frontmatter, and configures tool integrations.

```bash
npx docs-sentinel init [options]

Options:
  --dry-run          Preview changes without modifying files
  --no-tools         Skip tool integration setup
  --no-frontmatter   Skip frontmatter generation
  --docs-dir <path>  AI docs directory (default: ./docs)
```

### `check`

Find which AI docs reference a given source file.

```bash
npx docs-sentinel check --file <path> [options]

Options:
  --quiet           Only output if there are matches
  --format <fmt>    Output format: terminal, json (default: terminal)
```

### `audit`

Audit the health of all your AI docs.

```bash
npx docs-sentinel audit [options]

Options:
  --format <fmt>    Output format: terminal, json, markdown (default: terminal)
  --no-git          Skip git history, use filesystem timestamps
```

Exit code 1 if health score < 50 (useful for CI gating).

## Configuration

Create `.docs-sentinel.json` in your project root (auto-created by `init`):

```json
{
  "docsDir": "./docs",
  "ignore": [],
  "staleThresholdDays": 30,
  "archiveThresholdDays": 90,
  "pathPrefixes": ["src/", "apps/", "libs/"],
  "sourceExtensions": [".ts", ".tsx", ".js"],
  "frontmatterKey": null,
  "maxFileSize": 1048576
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `docsDir` | `./docs` | AI docs directory |
| `ignore` | `[]` | Glob patterns to ignore |
| `staleThresholdDays` | `30` | Days before a doc is considered stale |
| `archiveThresholdDays` | `90` | Days before a completed/deprecated doc is archivable |
| `pathPrefixes` | (auto-detected) | Path prefixes to recognize as source file references |
| `sourceExtensions` | (comprehensive set) | Source file extensions to track |
| `frontmatterKey` | `null` | Namespace key for frontmatter (e.g. `"docs_sentinel"`) |
| `maxFileSize` | `1048576` | Max file size in bytes (skip larger files) |

### Frontmatter namespacing

If your AI docs already use frontmatter, set `frontmatterKey` to avoid conflicts:

```json
{ "frontmatterKey": "docs_sentinel" }
```

This nests docs-sentinel fields under a key:

```yaml
---
title: My Doc
layout: default
docs_sentinel:
  status: active
  references: [src/auth.ts]
  last_verified: 2025-01-15
---
```

## Integrations

### Claude Code

`init` creates a PostToolUse hook that runs `check` after every Write/Edit operation, surfacing affected AI docs directly in the conversation.

### Cursor

`init` creates `.cursor/rules/docs-sentinel.mdc` instructing the AI to check doc freshness when editing referenced source files.

### VS Code

`init` adds a "docs-sentinel: audit" task to `.vscode/tasks.json`.

## Programmatic API

```typescript
import {
  scanDocs,
  checkFile,
  auditDocs,
  extractReferences,
  parseFrontmatter,
} from 'docs-sentinel';

// Scan all AI docs
const docs = await scanDocs('/path/to/project', config);

// Check which AI docs reference a source file
const result = await checkFile('src/auth.ts', '/path/to/project', config);

// Audit AI docs health
const audit = await auditDocs('/path/to/project', config);
console.log(`Health score: ${audit.healthScore}/100`);
```

## License

MIT
