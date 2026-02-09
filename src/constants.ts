import type { DocsSentinelConfig, DocCategory } from './types.js';

export const DEFAULT_DOCS_DIR = './docs';

export const CONFIG_FILENAME = '.docs-sentinel.json';

export const DEFAULT_CONFIG: DocsSentinelConfig = {
  docsDir: DEFAULT_DOCS_DIR,
  ignore: [],
  staleThresholdDays: 30,
  archiveThresholdDays: 90,
  maxFileSize: 1_048_576, // 1MB
};

export const DEFAULT_PATH_PREFIXES = [
  // JS/TS
  'apps/',
  'libs/',
  'src/',
  'packages/',
  // Go
  'cmd/',
  'internal/',
  'pkg/',
  // Rust
  'crates/',
  // Ruby
  'lib/',
  'spec/',
  'config/',
  // PHP
  'app/',
  'routes/',
  // General
  'bin/',
  'scripts/',
  'tools/',
  '.github/',
  'deploy/',
  'infra/',
];

export const SOURCE_EXTENSIONS = new Set([
  // JS/TS
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  // Systems
  '.rs',
  '.go',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  // JVM
  '.java',
  '.kt',
  '.kts',
  '.scala',
  '.gradle',
  // Web
  '.vue',
  '.svelte',
  '.astro',
  '.css',
  '.scss',
  // Python/Ruby/PHP
  '.py',
  '.rb',
  '.php',
  // Mobile
  '.swift',
  '.dart',
  // Other
  '.ex',
  '.exs',
  '.hs',
  '.prisma',
  '.graphql',
  '.sql',
  '.proto',
  // Config
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.tf',
  '.tfvars',
  // Scripts
  '.sh',
  '.bash',
  // Docs
  '.md',
  '.mdx',
]);

export const NAMED_FILES = new Set([
  'Dockerfile',
  'Makefile',
  'Justfile',
  'Procfile',
  'Gemfile',
]);

/**
 * Build FILE_REF_PATTERNS dynamically based on configured path prefixes.
 */
export function buildFileRefPatterns(prefixes: string[]): RegExp[] {
  const escapedPrefixes = prefixes.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const prefixAlt = escapedPrefixes.join('|');

  return [
    // Backtick-wrapped paths: `src/foo/bar.ts`
    new RegExp('`((?:' + prefixAlt + ')[^`\\s]+)`', 'g'),
    // Bare paths with known prefixes: apps/backend/src/foo.ts
    new RegExp('(?:^|\\s)((?:' + prefixAlt + ')\\S+\\.\\w+)', 'gm'),
    // Markdown link paths: [text](path)
    new RegExp('\\[(?:[^\\]]*)\\]\\(((?:' + prefixAlt + ')[^)\\s]+)\\)', 'g'),
  ];
}

export const CATEGORY_KEYWORDS: Record<string, DocCategory> = {
  'T-': 'ticket',
  ticket: 'ticket',
  PLAN: 'feature-plan',
  plan: 'feature-plan',
  ARCHITECTURE: 'architecture',
  architecture: 'architecture',
  ADR: 'architecture',
  GUIDELINES: 'architecture',
  guidelines: 'architecture',
  STRATEGY: 'strategy',
  strategy: 'strategy',
  SKILL: 'skill',
  skill: 'skill',
  README: 'general',
  CONTRIBUTING: 'general',
  CHANGELOG: 'general',
};

export const FEATURE_DIR_PATTERN = /docs\/feat[_-]([^/]+)/;
