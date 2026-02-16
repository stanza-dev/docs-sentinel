import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import fg from 'fast-glob';
import type { DocsSentinelConfig, InitResult } from '../types.js';
import { CONFIG_FILENAME, DEFAULT_CONFIG } from '../constants.js';
import { scanDocs } from '../core/scanner.js';
import { extractReferences, validateReferences } from '../core/references.js';
import {
  generateFrontmatter,
  mergeFrontmatter,
  serializeFrontmatter,
} from '../core/frontmatter.js';
import { detectTools, detectEcosystem } from '../integrations/detector.js';
import { setupClaudeCodeHook } from '../integrations/claude-code.js';
import { setupCursorRule } from '../integrations/cursor.js';
import { setupVSCodeTask } from '../integrations/vscode.js';

interface InitOptions {
  dryRun?: boolean;
  tools?: boolean;
  frontmatter?: boolean;
  docsDir?: string;
}

export async function runInit(
  projectRoot: string,
  options: InitOptions = {},
): Promise<InitResult> {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  let config: DocsSentinelConfig = { ...DEFAULT_CONFIG };
  let configCreated = false;

  // Load existing config
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      console.log(pc.yellow('Warning: Could not parse existing config, using defaults'));
    }
  }

  if (options.docsDir) {
    config.docsDir = options.docsDir;
  }

  // Verify docs dir exists
  const docsDir = path.resolve(projectRoot, config.docsDir);
  if (!fs.existsSync(docsDir)) {
    console.log(
      pc.red(
        `Error: Documentation directory not found: ${config.docsDir}\n` +
          `Create it with: mkdir -p ${config.docsDir}`,
      ),
    );
    return {
      docsScanned: 0,
      frontmatterAdded: 0,
      frontmatterSkipped: 0,
      toolsConfigured: [],
      configCreated: false,
    };
  }

  // Detect ecosystem and suggest prefixes
  const ecosystems = detectEcosystem(projectRoot);
  if (ecosystems.length > 0 && !config.pathPrefixes) {
    const allPrefixes = new Set<string>();
    for (const eco of ecosystems) {
      for (const prefix of eco.suggestedPrefixes) {
        allPrefixes.add(prefix);
      }
    }
    config.pathPrefixes = [...allPrefixes];
    console.log(
      pc.dim(
        `Detected: ${ecosystems.map((e) => e.language).join(', ')} — added path prefixes`,
      ),
    );
  }

  // Warn about .md files outside docs dir
  const rootMds = await fg(['*.md'], { cwd: projectRoot, absolute: false });
  const outsideDocs = rootMds.filter(
    (f) => !f.startsWith(config.docsDir.replace(/^\.\//, '')),
  );
  if (outsideDocs.length > 0) {
    console.log(
      pc.yellow(
        `Note: ${outsideDocs.length} markdown file(s) found outside ${config.docsDir}: ${outsideDocs.join(', ')}`,
      ),
    );
  }

  // Scan docs
  const docs = await scanDocs(projectRoot, config);
  let frontmatterAdded = 0;
  let frontmatterSkipped = 0;

  const shouldProcessFrontmatter = options.frontmatter !== false;

  if (shouldProcessFrontmatter) {
    for (const doc of docs) {
      if (doc.hasFrontmatter) {
        // Merge: add missing fields
        const refs = extractReferences(doc.content, config, doc.relativePath);
        const { existing } = validateReferences(projectRoot, refs);

        // Only merge if doc has no references or we found new valid ones
        const currentRefs = doc.frontmatter?.references ?? [];
        const mergedRefs =
          currentRefs.length > 0 ? currentRefs : existing;

        if (!options.dryRun) {
          const updated = mergeFrontmatter(doc.rawContent, mergedRefs, config);
          if (updated !== doc.rawContent) {
            fs.writeFileSync(doc.filePath, updated, 'utf-8');
          }
        }
        frontmatterSkipped++;
      } else if (doc.hasYamlFrontmatter) {
        // Doc has YAML frontmatter but not docs-sentinel fields — merge to preserve existing fields
        const refs = extractReferences(doc.content, config, doc.relativePath);
        const { existing } = validateReferences(projectRoot, refs);

        if (!options.dryRun) {
          const updated = mergeFrontmatter(doc.rawContent, existing, config);
          if (updated !== doc.rawContent) {
            fs.writeFileSync(doc.filePath, updated, 'utf-8');
          }
        }

        frontmatterAdded++;
        if (options.dryRun) {
          console.log(
            pc.dim(`  Would add frontmatter: ${doc.relativePath} (${existing.length} refs)`),
          );
        }
      } else {
        // No frontmatter at all — generate fresh
        const refs = extractReferences(doc.content, config, doc.relativePath);
        const { existing } = validateReferences(projectRoot, refs);
        const fm = generateFrontmatter(doc.relativePath, doc.content, existing);

        if (!options.dryRun) {
          const data: Record<string, unknown> = config.frontmatterKey
            ? { [config.frontmatterKey]: fm }
            : { ...fm };
          const output = serializeFrontmatter(data, doc.content);
          fs.writeFileSync(doc.filePath, output, 'utf-8');
        }

        frontmatterAdded++;
        if (options.dryRun) {
          console.log(
            pc.dim(`  Would add frontmatter: ${doc.relativePath} (${existing.length} refs)`),
          );
        }
      }
    }
  }

  // Tool integrations
  const toolsConfigured: string[] = [];
  const shouldConfigureTools = options.tools !== false;

  if (shouldConfigureTools && !options.dryRun) {
    const tools = detectTools(projectRoot);

    for (const tool of tools) {
      if (!tool.detected) continue;

      try {
        switch (tool.name) {
          case 'claude-code':
            if (setupClaudeCodeHook(projectRoot)) {
              toolsConfigured.push('claude-code');
            }
            break;
          case 'cursor':
            if (setupCursorRule(projectRoot)) {
              toolsConfigured.push('cursor');
            }
            break;
          case 'vscode':
            if (setupVSCodeTask(projectRoot)) {
              toolsConfigured.push('vscode');
            }
            break;
        }
      } catch (err) {
        console.log(pc.yellow(`Warning: Could not configure ${tool.name}: ${err}`));
      }
    }
  }

  // Write config if missing
  if (!fs.existsSync(configPath) && !options.dryRun) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    configCreated = true;
  }

  // Print summary
  console.log('');
  console.log(pc.bold('docs-sentinel init'));
  console.log(`  Docs scanned: ${pc.cyan(String(docs.length))}`);
  console.log(`  Frontmatter added: ${pc.green(String(frontmatterAdded))}`);
  console.log(`  Frontmatter skipped: ${pc.dim(String(frontmatterSkipped))}`);
  if (toolsConfigured.length > 0) {
    console.log(
      `  Tools configured: ${toolsConfigured.map((t) => pc.green(t)).join(', ')}`,
    );
  }
  if (configCreated) {
    console.log(`  Config created: ${pc.green(CONFIG_FILENAME)}`);
  }
  if (options.dryRun) {
    console.log(pc.yellow('  (dry run — no files modified)'));
  }

  return {
    docsScanned: docs.length,
    frontmatterAdded,
    frontmatterSkipped,
    toolsConfigured,
    configCreated,
  };
}

export function findProjectRoot(startDir: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    if (
      fs.existsSync(path.join(current, '.git')) ||
      fs.existsSync(path.join(current, 'package.json'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}
