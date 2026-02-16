import fs from 'node:fs';
import path from 'node:path';
import type { DetectedTool, ToolName } from '../types.js';

const TOOL_MARKERS: { name: ToolName; dir: string; configPath: string }[] = [
  { name: 'claude-code', dir: '.claude', configPath: '.claude/settings.json' },
  { name: 'cursor', dir: '.cursor', configPath: '.cursor/rules' },
  { name: 'vscode', dir: '.vscode', configPath: '.vscode/tasks.json' },
  { name: 'husky', dir: '.husky', configPath: '.husky' },
];

export function detectTools(projectRoot: string): DetectedTool[] {
  return TOOL_MARKERS.map(({ name, dir, configPath }) => ({
    name,
    detected: fs.existsSync(path.join(projectRoot, dir)),
    configPath,
  }));
}

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm';

export function detectPackageManager(projectRoot: string): PackageManager {
  if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectRoot, 'bun.lockb')) || fs.existsSync(path.join(projectRoot, 'bun.lock'))) return 'bun';
  return 'npm';
}

export function getRunnerCommand(pm: PackageManager): string {
  switch (pm) {
    case 'pnpm':
      return 'pnpm dlx';
    case 'yarn':
      return 'npx';
    case 'bun':
      return 'bunx';
    default:
      return 'npx';
  }
}

export function detectEcosystem(
  projectRoot: string,
): { language: string; suggestedPrefixes: string[] }[] {
  const ecosystems: { language: string; suggestedPrefixes: string[] }[] = [];

  const markers: { file: string; language: string; prefixes: string[] }[] = [
    { file: 'go.mod', language: 'go', prefixes: ['cmd/', 'internal/', 'pkg/'] },
    { file: 'Cargo.toml', language: 'rust', prefixes: ['crates/', 'src/'] },
    {
      file: 'pyproject.toml',
      language: 'python',
      prefixes: ['src/', 'lib/', 'tests/'],
    },
    {
      file: 'Gemfile',
      language: 'ruby',
      prefixes: ['lib/', 'spec/', 'config/', 'app/'],
    },
    {
      file: 'composer.json',
      language: 'php',
      prefixes: ['app/', 'routes/', 'src/'],
    },
  ];

  for (const { file, language, prefixes } of markers) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      ecosystems.push({ language, suggestedPrefixes: prefixes });
    }
  }

  return ecosystems;
}
