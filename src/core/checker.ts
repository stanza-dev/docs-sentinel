import type {
  CheckResult,
  AffectedDoc,
  ScannedDoc,
  DocsSentinelConfig,
} from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';
import { scanDocsWithRefs } from './scanner.js';
import { normalizeRef } from './references.js';

export async function checkFile(
  sourceFile: string,
  projectRoot: string,
  config: DocsSentinelConfig = DEFAULT_CONFIG,
): Promise<CheckResult> {
  const docs = await scanDocsWithRefs(projectRoot, config);
  const index = buildReferenceIndex(docs);
  const normalized = normalizeRef(sourceFile);

  const matchingDocs = lookupFile(normalized, index);

  const today = new Date();
  const affectedDocs: AffectedDoc[] = matchingDocs.map((doc) => {
    const lastVerified = doc.frontmatter!.last_verified;
    const verifiedDate = new Date(lastVerified);
    const daysSince = Math.floor(
      (today.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      docPath: doc.relativePath,
      lastVerified,
      daysSinceVerified: daysSince,
      status: doc.frontmatter!.status,
    };
  });

  return { sourceFile, affectedDocs };
}

export function buildReferenceIndex(
  docs: ScannedDoc[],
): Map<string, ScannedDoc[]> {
  const index = new Map<string, ScannedDoc[]>();

  for (const doc of docs) {
    if (!doc.frontmatter) continue;
    for (const ref of doc.frontmatter.references) {
      const normalized = normalizeRef(ref);
      const existing = index.get(normalized) ?? [];
      existing.push(doc);
      index.set(normalized, existing);
    }
  }

  return index;
}

function lookupFile(
  normalizedPath: string,
  index: Map<string, ScannedDoc[]>,
): ScannedDoc[] {
  // Exact match
  const exact = index.get(normalizedPath);
  if (exact && exact.length > 0) return exact;

  // Suffix match: iterate index and check if key ends with the path or vice versa
  const results: ScannedDoc[] = [];
  const seen = new Set<string>();

  for (const [key, docs] of index) {
    if (normalizedPath.endsWith(key) || key.endsWith(normalizedPath)) {
      for (const doc of docs) {
        if (!seen.has(doc.relativePath)) {
          seen.add(doc.relativePath);
          results.push(doc);
        }
      }
    }
  }

  return results;
}
