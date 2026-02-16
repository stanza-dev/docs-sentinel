import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectTools, detectPackageManager, detectEcosystem } from '../src/integrations/detector.js';
import { setupClaudeCodeHook } from '../src/integrations/claude-code.js';
import { setupCursorRule } from '../src/integrations/cursor.js';
import { setupVSCodeTask } from '../src/integrations/vscode.js';
import { stripJsoncComments } from '../src/integrations/jsonc.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'docs-sentinel-test-'));
}

describe('detectTools', () => {
  it('detects present tools', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(dir, '.vscode'), { recursive: true });

    const tools = detectTools(dir);
    const claude = tools.find((t) => t.name === 'claude-code');
    const vscode = tools.find((t) => t.name === 'vscode');
    const cursor = tools.find((t) => t.name === 'cursor');

    expect(claude?.detected).toBe(true);
    expect(vscode?.detected).toBe(true);
    expect(cursor?.detected).toBe(false);

    fs.rmSync(dir, { recursive: true });
  });
});

describe('detectPackageManager', () => {
  it('detects pnpm', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');
    expect(detectPackageManager(dir)).toBe('pnpm');
    fs.rmSync(dir, { recursive: true });
  });

  it('detects bun from bun.lockb', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'bun.lockb'), '');
    expect(detectPackageManager(dir)).toBe('bun');
    fs.rmSync(dir, { recursive: true });
  });

  it('detects bun from bun.lock (text format)', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'bun.lock'), '');
    expect(detectPackageManager(dir)).toBe('bun');
    fs.rmSync(dir, { recursive: true });
  });

  it('defaults to npm', () => {
    const dir = makeTempDir();
    expect(detectPackageManager(dir)).toBe('npm');
    fs.rmSync(dir, { recursive: true });
  });
});

describe('detectEcosystem', () => {
  it('detects Go ecosystem', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'go.mod'), '');
    const eco = detectEcosystem(dir);
    expect(eco).toHaveLength(1);
    expect(eco[0].language).toBe('go');
    fs.rmSync(dir, { recursive: true });
  });
});

describe('setupClaudeCodeHook', () => {
  it('creates hook script and settings.json', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });

    setupClaudeCodeHook(dir);

    const hookPath = path.join(dir, '.claude/hooks/docs-sentinel-hook.mjs');
    expect(fs.existsSync(hookPath)).toBe(true);

    const settings = JSON.parse(
      fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf-8'),
    );
    expect(settings.hooks.PostToolUse).toHaveLength(1);
    expect(settings.hooks.PostToolUse[0].matcher).toBe('Write|Edit');

    fs.rmSync(dir, { recursive: true });
  });

  it('does not duplicate hooks on second run', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });

    setupClaudeCodeHook(dir);
    setupClaudeCodeHook(dir);

    const settings = JSON.parse(
      fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf-8'),
    );
    expect(settings.hooks.PostToolUse).toHaveLength(1);

    fs.rmSync(dir, { recursive: true });
  });
});

describe('setupCursorRule', () => {
  it('creates cursor rule file', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });

    setupCursorRule(dir);

    const rulePath = path.join(dir, '.cursor/rules/docs-sentinel.mdc');
    expect(fs.existsSync(rulePath)).toBe(true);
    const content = fs.readFileSync(rulePath, 'utf-8');
    expect(content).toContain('docs-sentinel');

    fs.rmSync(dir, { recursive: true });
  });
});

describe('setupVSCodeTask', () => {
  it('creates tasks.json with audit task', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.vscode'), { recursive: true });

    setupVSCodeTask(dir);

    const tasks = JSON.parse(
      fs.readFileSync(path.join(dir, '.vscode/tasks.json'), 'utf-8'),
    );
    expect(tasks.tasks).toHaveLength(1);
    expect(tasks.tasks[0].label).toBe('docs-sentinel: audit');

    fs.rmSync(dir, { recursive: true });
  });

  it('preserves existing tasks from JSONC file with inline and block comments', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.vscode'), { recursive: true });

    const jsonc = `{
  // Version of the tasks format
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build", // Build the project
      "type": "shell",
      "command": "npm run build"
    }
    /* more tasks can be added here */
  ]
}`;
    fs.writeFileSync(path.join(dir, '.vscode/tasks.json'), jsonc);

    setupVSCodeTask(dir);

    const tasks = JSON.parse(
      fs.readFileSync(path.join(dir, '.vscode/tasks.json'), 'utf-8'),
    );
    expect(tasks.tasks).toHaveLength(2);
    expect(tasks.tasks[0].label).toBe('build');
    expect(tasks.tasks[1].label).toBe('docs-sentinel: audit');

    fs.rmSync(dir, { recursive: true });
  });
});

describe('setupClaudeCodeHook with JSONC', () => {
  it('preserves existing settings from JSONC file with comments', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });

    const jsonc = `{
  // My custom permissions
  "permissions": {
    "allow": ["Read"] // only read allowed
  }
  /* hooks will be added by tools */
}`;
    fs.writeFileSync(path.join(dir, '.claude/settings.json'), jsonc);

    setupClaudeCodeHook(dir);

    const settings = JSON.parse(
      fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf-8'),
    );
    expect(settings.permissions.allow).toEqual(['Read']);
    expect(settings.hooks.PostToolUse).toHaveLength(1);

    fs.rmSync(dir, { recursive: true });
  });
});

describe('stripJsoncComments', () => {
  it('strips single-line comments', () => {
    const input = '{\n  // comment\n  "key": "value"\n}';
    expect(JSON.parse(stripJsoncComments(input))).toEqual({ key: 'value' });
  });

  it('strips inline comments', () => {
    const input = '{ "key": "value" // inline comment\n}';
    expect(JSON.parse(stripJsoncComments(input))).toEqual({ key: 'value' });
  });

  it('strips block comments', () => {
    const input = '{ /* block */ "key": "value" }';
    expect(JSON.parse(stripJsoncComments(input))).toEqual({ key: 'value' });
  });

  it('preserves // inside strings', () => {
    const input = '{ "url": "https://example.com" }';
    expect(JSON.parse(stripJsoncComments(input))).toEqual({ url: 'https://example.com' });
  });

  it('handles escaped quotes inside strings', () => {
    const input = '{ "msg": "say \\"hello\\"" }';
    expect(JSON.parse(stripJsoncComments(input))).toEqual({ msg: 'say "hello"' });
  });
});
