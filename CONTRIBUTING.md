# Contributing to docs-sentinel

## Prerequisites

- Node.js >= 18
- pnpm

## Setup

```bash
git clone <repo-url>
cd docs-sentinel
pnpm install
```

## Development

```bash
pnpm dev          # Watch mode (rebuilds on change)
pnpm build        # Production build
pnpm test         # Run tests
pnpm test:watch   # Watch mode
pnpm test:coverage # With coverage
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint
pnpm format       # Prettier
```

## Project Structure

```
src/
├── types.ts              # All TypeScript interfaces
├── constants.ts          # Default config, patterns, extensions
├── index.ts              # Public API exports
├── cli.ts                # CLI entry point (Commander)
├── core/
│   ├── scanner.ts        # Doc scanning (fast-glob + frontmatter parsing)
│   ├── frontmatter.ts    # Frontmatter parse/generate/merge
│   ├── references.ts     # Reference extraction pipeline
│   ├── checker.ts        # File → doc lookup
│   └── auditor.ts        # Full health audit
├── commands/
│   ├── init.ts           # Init command
│   ├── check.ts          # Check command
│   └── audit.ts          # Audit command
├── reporters/
│   ├── terminal.ts       # Colored terminal output
│   ├── json.ts           # JSON output
│   └── markdown.ts       # Markdown tables
└── integrations/
    ├── detector.ts       # Tool/ecosystem detection
    ├── claude-code.ts    # Claude Code hook setup
    ├── cursor.ts         # Cursor rule setup
    └── vscode.ts         # VS Code task setup
```

## Testing

Tests live in `tests/` with fixtures in `tests/fixtures/sample-project/`.

```bash
pnpm test                 # Run all tests
pnpm test -- references   # Run specific test file
```

## Commit Convention

Use conventional commits:

```
feat: add new feature
fix: fix a bug
docs: documentation changes
test: test changes
chore: build/config changes
```

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `pnpm test && pnpm typecheck && pnpm lint`
5. Submit a PR
