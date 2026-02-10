import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import type { DocsSentinelConfig, ScannedDoc } from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';
import { parseFrontmatter } from './frontmatter.js';

export async function scanDocs(
  projectRoot: string,
  config: DocsSentinelConfig = DEFAULT_CONFIG,
): Promise<ScannedDoc[]> {
  const docsDir = path.resolve(projectRoot, config.docsDir);

  if (!fs.existsSync(docsDir)) {
    return [];
  }

  const maxFileSize = config.maxFileSize ?? DEFAULT_CONFIG.maxFileSize!;

  const files = await fg(['**/*.md', '**/*.mdx'], {
    cwd: docsDir,
    absolute: false,
    ignore: config.ignore,
    dot: false,
  });

  const docs: ScannedDoc[] = [];

  for (const file of files) {
    const absPath = path.join(docsDir, file);

    const stat = fs.statSync(absPath);
    if (stat.size > maxFileSize) {
      continue;
    }

    let rawContent: string;
    try {
      rawContent = fs.readFileSync(absPath, 'utf-8');
    } catch {
      // Skip non-UTF-8 files
      continue;
    }

    const relativePath = path.posix.join(
      config.docsDir.replace(/^\.\//, ''),
      file.split(path.sep).join('/'),
    );

    const parsed = parseFrontmatter(rawContent, config);

    docs.push({
      filePath: absPath,
      relativePath,
      hasFrontmatter: parsed.isValid,
      frontmatter: parsed.isValid ? parsed.frontmatter : null,
      content: parsed.content,
      rawContent,
    });
  }

  return docs;
}

export async function scanDocsWithRefs(
  projectRoot: string,
  config: DocsSentinelConfig = DEFAULT_CONFIG,
): Promise<ScannedDoc[]> {
  const all = await scanDocs(projectRoot, config);
  return all.filter(
    (doc) =>
      doc.hasFrontmatter &&
      doc.frontmatter &&
      doc.frontmatter.references.length > 0,
  );
}
