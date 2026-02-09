import fs from 'node:fs';
import path from 'node:path';

const CURSOR_RULE = `---
description: Documentation freshness enforcement
globs: ["docs/**/*.md", "docs/**/*.mdx"]
---

# docs-sentinel: Keep Documentation Fresh

When you edit a source file that is referenced in documentation under \`./docs/\`,
remind the user to verify the affected docs are still accurate.

Run \`npx docs-sentinel check --file <changed-file>\` after editing source files
to see which docs reference them.

Before committing, run \`npx docs-sentinel audit\` to check overall documentation health.
`;

export function setupCursorRule(projectRoot: string): boolean {
  const rulesDir = path.join(projectRoot, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  const rulePath = path.join(rulesDir, 'docs-sentinel.mdc');

  // Skip if already exists
  if (fs.existsSync(rulePath)) {
    return false;
  }

  fs.writeFileSync(rulePath, CURSOR_RULE, 'utf-8');
  return true;
}
