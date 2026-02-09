import fs from 'node:fs';
import path from 'node:path';
import type { DocsSentinelConfig, ReportFormat } from '../types.js';
import { CONFIG_FILENAME, DEFAULT_CONFIG } from '../constants.js';
import { checkFile } from '../core/checker.js';
import { normalizeRef } from '../core/references.js';
import { formatCheckTerminal } from '../reporters/terminal.js';
import { formatCheckJson } from '../reporters/json.js';
import { findProjectRoot } from './init.js';

interface CheckOptions {
  file: string;
  quiet?: boolean;
  format?: ReportFormat;
}

export async function runCheck(options: CheckOptions): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    if (!options.quiet) {
      console.error('Error: Could not find project root (.git or package.json)');
    }
    process.exit(1);
  }

  const config = loadConfig(projectRoot);

  // Resolve file path relative to project root
  let sourceFile = options.file;
  if (path.isAbsolute(sourceFile)) {
    sourceFile = path.relative(projectRoot, sourceFile);
  }
  sourceFile = normalizeRef(sourceFile);

  // If the edited file is inside docsDir, skip staleness check
  const docsPrefix = config.docsDir.replace(/^\.\//, '');
  if (sourceFile.startsWith(docsPrefix)) {
    if (!options.quiet) {
      // Doc file edited — no staleness warning needed
    }
    return;
  }

  const result = await checkFile(sourceFile, projectRoot, config);

  if (result.affectedDocs.length === 0) {
    return;
  }

  const format = options.format ?? 'terminal';
  let output: string;

  switch (format) {
    case 'json':
      output = formatCheckJson(result);
      break;
    case 'terminal':
    default:
      output = formatCheckTerminal(result);
      break;
  }

  if (output) {
    console.log(output);
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
