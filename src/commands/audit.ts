import fs from 'node:fs';
import path from 'node:path';
import type { DocsSentinelConfig, ReportFormat } from '../types.js';
import { CONFIG_FILENAME, DEFAULT_CONFIG } from '../constants.js';
import { auditDocs } from '../core/auditor.js';
import { formatAuditTerminal } from '../reporters/terminal.js';
import { formatAuditJson } from '../reporters/json.js';
import { formatAuditMarkdown } from '../reporters/markdown.js';
import { findProjectRoot } from './init.js';

interface AuditOptions {
  format?: ReportFormat;
  noGit?: boolean;
}

export async function runAudit(options: AuditOptions = {}): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    console.error('Error: Could not find project root (.git or package.json)');
    process.exit(1);
  }

  const config = loadConfig(projectRoot);
  const result = await auditDocs(projectRoot, config, {
    noGit: options.noGit,
  });

  const format = options.format ?? 'terminal';
  let output: string;

  switch (format) {
    case 'json':
      output = formatAuditJson(result);
      break;
    case 'markdown':
      output = formatAuditMarkdown(result);
      break;
    case 'terminal':
    default:
      output = formatAuditTerminal(result);
      break;
  }

  console.log(output);

  // Exit code 1 if health score below 50 (for CI gating)
  if (result.healthScore < 50) {
    process.exit(1);
  }
}

function loadConfig(projectRoot: string): DocsSentinelConfig {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}
