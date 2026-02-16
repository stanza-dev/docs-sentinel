import fs from 'node:fs';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import type {
  AuditResult,
  StaleDoc,
  OrphanedRef,
  DocsSentinelConfig,
} from '../types.js';
import { DEFAULT_CONFIG } from '../constants.js';
import { scanDocs } from './scanner.js';
import { validateReferences } from './references.js';

export async function auditDocs(
  projectRoot: string,
  config: DocsSentinelConfig = DEFAULT_CONFIG,
  options: { noGit?: boolean } = {},
): Promise<AuditResult> {
  const docs = await scanDocs(projectRoot, config);

  const totalDocs = docs.length;
  const docsWithFrontmatter = docs.filter((d) => d.hasFrontmatter).length;
  const docsWithoutFrontmatter = docs
    .filter((d) => !d.hasFrontmatter)
    .map((d) => d.relativePath);

  // Collect all referenced files across all docs
  const allRefs = new Set<string>();
  for (const doc of docs) {
    if (doc.frontmatter) {
      for (const ref of doc.frontmatter.references) {
        allRefs.add(ref);
      }
    }
  }

  // Validate references (orphaned = file doesn't exist)
  const { missing } = validateReferences(projectRoot, [...allRefs]);
  const orphanedRefs: OrphanedRef[] = [];
  for (const doc of docs) {
    if (!doc.frontmatter) continue;
    for (const ref of doc.frontmatter.references) {
      if (missing.includes(ref)) {
        orphanedRefs.push({ docPath: doc.relativePath, missingRef: ref });
      }
    }
  }

  // Get last modification dates for referenced files
  const refModDates = await getFileModificationDates(
    projectRoot,
    [...allRefs],
    options.noGit,
  );

  // Check staleness
  const staleDocs: StaleDoc[] = [];
  const today = new Date();
  const staleThreshold = config.staleThresholdDays;

  for (const doc of docs) {
    if (!doc.frontmatter) continue;

    const lastVerified = new Date(doc.frontmatter.last_verified);
    const daysSince = Math.floor(
      (today.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince < staleThreshold) continue;

    // Check if any referenced file changed since last_verified
    const changedRefs: string[] = [];
    for (const ref of doc.frontmatter.references) {
      const modDate = refModDates.get(ref);
      if (modDate && modDate > lastVerified) {
        changedRefs.push(ref);
      }
    }

    if (changedRefs.length > 0 || daysSince >= staleThreshold) {
      staleDocs.push({
        docPath: doc.relativePath,
        lastVerified: doc.frontmatter.last_verified,
        daysSinceVerified: daysSince,
        changedReferences: changedRefs,
      });
    }
  }

  // Archivable docs: deprecated + old or completed + old
  const archiveThreshold = config.archiveThresholdDays;
  const archivableDocs = docs
    .filter((doc) => {
      if (!doc.frontmatter) return false;
      const lastVerified = new Date(doc.frontmatter.last_verified);
      const daysSince = Math.floor(
        (today.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24),
      );
      return (
        (doc.frontmatter.status === 'deprecated' ||
          doc.frontmatter.status === 'completed') &&
        daysSince >= archiveThreshold
      );
    })
    .map((d) => d.relativePath);

  const healthScore = computeHealthScore(
    totalDocs,
    docsWithoutFrontmatter.length,
    staleDocs.length,
    orphanedRefs.length,
  );

  return {
    totalDocs,
    docsWithFrontmatter,
    docsWithoutFrontmatter,
    staleDocs,
    orphanedRefs,
    archivableDocs,
    healthScore,
  };
}

export function computeHealthScore(
  total: number,
  withoutFrontmatter: number,
  stale: number,
  orphaned: number,
): number {
  if (total === 0) return 100;
  let score = 100;
  score -= withoutFrontmatter * 2;
  score -= stale * 3;
  score -= orphaned * 1;
  return Math.max(0, Math.min(100, score));
}

async function getFileModificationDates(
  projectRoot: string,
  files: string[],
  noGit?: boolean,
): Promise<Map<string, Date>> {
  const dates = new Map<string, Date>();
  if (files.length === 0) return dates;

  const useGit = !noGit && await isGitRepo(projectRoot);

  if (useGit) {
    const isShallow = await isShallowClone(projectRoot);
    if (isShallow) {
      // Fall back to fs mtime for shallow clones
      return getFsMtimes(projectRoot, files);
    }

    return getGitDates(projectRoot, files);
  }

  return getFsMtimes(projectRoot, files);
}

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    const git = simpleGit(dir);
    await git.revparse(['--git-dir']);
    return true;
  } catch {
    return false;
  }
}

async function isShallowClone(dir: string): Promise<boolean> {
  try {
    const git = simpleGit(dir);
    const result = await git.raw(['rev-parse', '--is-shallow-repository']);
    return result.trim() === 'true';
  } catch {
    return false;
  }
}

async function getGitDates(
  projectRoot: string,
  files: string[],
): Promise<Map<string, Date>> {
  const dates = new Map<string, Date>();
  const git = simpleGit(projectRoot);

  // Query each file individually to get its own last-modified date
  for (const file of files) {
    const absPath = path.resolve(projectRoot, file);
    if (!fs.existsSync(absPath)) continue;

    try {
      const result = await git.raw([
        'log',
        '-1',
        '--format=%ct',
        '--',
        file,
      ]);
      const ts = parseInt(result.trim(), 10);
      if (!isNaN(ts)) {
        dates.set(file, new Date(ts * 1000));
      } else {
        dates.set(file, fs.statSync(absPath).mtime);
      }
    } catch {
      // Fall back to fs mtime
      dates.set(file, fs.statSync(absPath).mtime);
    }
  }

  return dates;
}

function getFsMtimes(
  projectRoot: string,
  files: string[],
): Map<string, Date> {
  const dates = new Map<string, Date>();
  for (const file of files) {
    const absPath = path.resolve(projectRoot, file);
    if (fs.existsSync(absPath)) {
      dates.set(file, fs.statSync(absPath).mtime);
    }
  }
  return dates;
}
