# Changelog

## 0.1.1

- Added `repository` field to `package.json` for npm page visibility
- Added `pnpm` install instructions to README
- Fixed `repository.url` format (added `git+` prefix)
- Fixed `init` crash when `feature` frontmatter field is undefined
- Fixed `audit` assigning the same git date to all referenced files (incorrect staleness detection)
- Fixed `init` destroying existing YAML frontmatter (e.g. `title`, `layout`) on docs without docs-sentinel fields
- Fixed CLI `--version` showing stale hardcoded version instead of reading from `package.json`
- Fixed JSONC comment stripping for `settings.json` and `tasks.json` (now handles inline `//` and block `/* */` comments)
- Fixed `bun.lock` (text format) not being detected as Bun package manager

## 0.1.0

Initial release.

- `init` command: scan docs, add frontmatter, configure tool integrations
- `check` command: find docs referencing a changed source file
- `audit` command: full documentation health audit with health score
- Reference extraction pipeline with false positive filtering
- Claude Code, Cursor, VS Code integrations
- Terminal, JSON, markdown output formats
- Configurable path prefixes, extensions, staleness thresholds
- Frontmatter namespacing for static site generator compatibility
