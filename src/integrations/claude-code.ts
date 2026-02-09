import fs from 'node:fs';
import path from 'node:path';
import { detectPackageManager, getRunnerCommand } from './detector.js';

const HOOK_SCRIPT_TEMPLATE = (runner: string) => `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

let input;
try {
  input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath) process.exit(0);

try {
  const output = execSync(\`${runner} docs-sentinel check --file "\${filePath}" --quiet\`, {
    encoding: 'utf-8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();

  if (output) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: output,
        },
      }),
    );
  }
} catch {
  // Silent on error — don't block the AI tool
}
`;

export function setupClaudeCodeHook(projectRoot: string): boolean {
  const pm = detectPackageManager(projectRoot);
  const runner = getRunnerCommand(pm);

  // 1. Create hook script
  const hooksDir = path.join(projectRoot, '.claude', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, 'docs-sentinel-hook.mjs');
  fs.writeFileSync(hookPath, HOOK_SCRIPT_TEMPLATE(runner), 'utf-8');
  fs.chmodSync(hookPath, 0o755);

  // 2. Merge into settings.json
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  let settings: Record<string, unknown> = {};

  if (fs.existsSync(settingsPath)) {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      // Strip single-line comments (JSONC)
      const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
      settings = JSON.parse(stripped);
    } catch {
      // Can't parse, start fresh for hooks
    }
  }

  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const postToolUse = (hooks.PostToolUse ?? []) as Array<{
    matcher?: string;
    hooks?: Array<{ type: string; command: string; timeout?: number }>;
  }>;

  // Check if already present
  const alreadyPresent = postToolUse.some((entry) =>
    entry.hooks?.some((h) => h.command?.includes('docs-sentinel-hook')),
  );

  if (!alreadyPresent) {
    postToolUse.push({
      matcher: 'Write|Edit',
      hooks: [
        {
          type: 'command',
          command:
            'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/docs-sentinel-hook.mjs',
          timeout: 30,
        },
      ],
    });
  }

  hooks.PostToolUse = postToolUse;
  settings.hooks = hooks;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

  return true;
}
