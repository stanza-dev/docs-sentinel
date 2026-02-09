# docs-sentinel

Keep documentation fresh by tracking references between markdown files and source code.

docs-sentinel scans your `./docs/` directory, extracts file path references from markdown content, and warns you when referenced source files change — so your docs never silently go stale.

## Features

- **Reference extraction** — Automatically finds source file paths in markdown (backtick-wrapped, bare paths, markdown links)
- **Frontmatter management** — Adds YAML frontmatter with status, category, references, and verification date
- **Staleness detection** — Uses git history to flag docs whose referenced files have changed
- **Health audit** — Computes a documentation health score (0–100) for CI gating
- **Tool integrations** — Auto-configures Claude Code hooks, Cursor rules, VS Code tasks
- **Language-agnostic** — Works with any codebase (JS/TS, Go, Rust, Python, Ruby, PHP, etc.)

## Quick Start

```bash
# In your project root (must have a ./docs/ directory)
npx docs-sentinel init

# Check which docs reference a changed file
npx docs-sentinel check --file src/auth/auth.service.ts

# Full documentation health audit
npx docs-sentinel audit
```

## Commands

### `init`

Scans docs, adds frontmatter, and configures tool integrations.

```bash
npx docs-sentinel init [options]

Options:
  --dry-run          Preview changes without modifying files
  --no-tools         Skip tool integration setup
  --no-frontmatter   Skip frontmatter generation
  --docs-dir <path>  Documentation directory (default: ./docs)
```

### `check`

Check which docs reference a given source file.

```bash
npx docs-sentinel check --file <path> [options]

Options:
  --quiet           Only output if there are matches
  --format <fmt>    Output format: terminal, json (default: terminal)
```

### `audit`

Full documentation health audit.

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
| `docsDir` | `./docs` | Documentation directory |
| `ignore` | `[]` | Glob patterns to ignore |
| `staleThresholdDays` | `30` | Days before a doc is considered stale |
| `archiveThresholdDays` | `90` | Days before a completed/deprecated doc is archivable |
| `pathPrefixes` | (auto-detected) | Path prefixes to recognize as file references |
| `sourceExtensions` | (comprehensive set) | File extensions to track |
| `frontmatterKey` | `null` | Namespace key for frontmatter (e.g. `"docs_sentinel"`) |
| `maxFileSize` | `1048576` | Max file size in bytes (skip larger files) |

### Frontmatter namespacing

If your docs already use frontmatter (Hugo, Jekyll, Docusaurus), set `frontmatterKey` to avoid conflicts:

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

`init` creates a PostToolUse hook that runs `check` after every Write/Edit operation, surfacing affected docs directly in the AI conversation.

### Cursor

`init` creates `.cursor/rules/docs-sentinel.mdc` with instructions for the AI to check doc freshness.

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

// Scan all docs
const docs = await scanDocs('/path/to/project', config);

// Check a specific file
const result = await checkFile('src/auth.ts', '/path/to/project', config);

// Full audit
const audit = await auditDocs('/path/to/project', config);
console.log(`Health score: ${audit.healthScore}/100`);
```

## License

MIT
