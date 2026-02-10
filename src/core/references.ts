import fs from 'node:fs';
import path from 'node:path';
import {
  SOURCE_EXTENSIONS,
  NAMED_FILES,
  DEFAULT_PATH_PREFIXES,
  buildFileRefPatterns,
} from '../constants.js';
import type { DocsSentinelConfig, ScannedDoc } from '../types.js';

/**
 * Multi-pass reference extraction pipeline.
 * Order matters: strip noise first, then extract paths.
 */
export function extractReferences(
  content: string,
  config?: DocsSentinelConfig,
  docPath?: string,
): string[] {
  let text = content;

  // 1. Strip fenced code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/~~~[\s\S]*?~~~/g, '');

  // 2. Strip URLs
  text = text.replace(/https?:\/\/[^\s)>]+/g, '');

  // 3. Strip lines with box-drawing characters (ASCII tree diagrams)
  text = text
    .split('\n')
    .filter((line) => !/[├└│─┬┤┼┐┘┌]/.test(line))
    .join('\n');

  // 4. Strip MDX/JSX import/export lines
  text = text
    .split('\n')
    .filter((line) => !/^(?:import|export)\s+/.test(line.trim()))
    .join('\n');

  // 5. Apply file reference patterns
  const prefixes = config?.pathPrefixes ?? DEFAULT_PATH_PREFIXES;
  const patterns = buildFileRefPatterns(prefixes);
  const extensions = config?.sourceExtensions
    ? new Set(config.sourceExtensions)
    : SOURCE_EXTENSIONS;

  const refs = new Set<string>();

  for (const pattern of patterns) {
    // Reset lastIndex for stateful regexes
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const ref = match[1];
      if (ref) {
        refs.add(ref);
      }
    }
  }

  // Also match named files (Dockerfile, Makefile, etc.) with prefix paths
  for (const namedFile of NAMED_FILES) {
    const namedPattern = new RegExp(
      '(?:^|[`\\s])(' +
        prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
        ')([\\w/.-]*' +
        namedFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        ')',
      'gm',
    );
    let match: RegExpExecArray | null;
    while ((match = namedPattern.exec(text)) !== null) {
      refs.add(match[1] + match[2]);
    }
  }

  // 6. Resolve relative paths
  const resolvedRefs = new Set<string>();
  for (const ref of refs) {
    let normalized = normalizeRef(ref);

    if (docPath && (normalized.startsWith('../') || normalized.startsWith('./'))) {
      const docDir = path.posix.dirname(docPath);
      normalized = path.posix.normalize(path.posix.join(docDir, normalized));
    }

    resolvedRefs.add(normalized);
  }

  // 7. Filter out template/placeholder paths
  const filtered = [...resolvedRefs].filter((ref) => !ref.includes('{') && !ref.includes('}'));

  // 8. Filter by known extensions + named files
  return filtered.filter((ref) => {
    const basename = ref.split('/').pop() ?? '';
    if (NAMED_FILES.has(basename)) return true;
    const ext = path.posix.extname(ref);
    return ext !== '' && extensions.has(ext);
  });
}

export function validateReferences(
  projectRoot: string,
  refs: string[],
): { existing: string[]; missing: string[] } {
  const existing: string[] = [];
  const missing: string[] = [];

  for (const ref of refs) {
    const absPath = path.resolve(projectRoot, ref);
    if (fs.existsSync(absPath)) {
      existing.push(ref);
    } else {
      missing.push(ref);
    }
  }

  return { existing, missing };
}

export function findDocsReferencingFile(
  sourceFile: string,
  docs: ScannedDoc[],
): ScannedDoc[] {
  const normalized = normalizeRef(sourceFile);
  return docs.filter((doc) => {
    if (!doc.frontmatter) return false;
    return doc.frontmatter.references.some((ref) => {
      const normRef = normalizeRef(ref);
      // Exact match
      if (normRef === normalized) return true;
      // Basename fallback: match if ref ends with the source file's relative path
      if (normalized.endsWith(normRef) || normRef.endsWith(normalized)) return true;
      return false;
    });
  });
}

export function normalizeRef(ref: string): string {
  let normalized = ref.split(path.sep).join('/');
  // Strip leading ./
  normalized = normalized.replace(/^\.\//, '');
  // Strip leading /
  normalized = normalized.replace(/^\//, '');
  return normalized;
}
