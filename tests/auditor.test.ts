import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { computeHealthScore, auditDocs } from '../src/core/auditor.js';

describe('computeHealthScore', () => {
  it('returns 100 for perfect docs', () => {
    expect(computeHealthScore(10, 0, 0, 0)).toBe(100);
  });

  it('returns 100 for no docs', () => {
    expect(computeHealthScore(0, 0, 0, 0)).toBe(100);
  });

  it('deducts 2 per doc without frontmatter', () => {
    expect(computeHealthScore(10, 5, 0, 0)).toBe(90);
  });

  it('deducts 3 per stale doc', () => {
    expect(computeHealthScore(10, 0, 3, 0)).toBe(91);
  });

  it('deducts 1 per orphaned ref', () => {
    expect(computeHealthScore(10, 0, 0, 5)).toBe(95);
  });

  it('floors at 0', () => {
    expect(computeHealthScore(10, 50, 50, 50)).toBe(0);
  });

  it('combines all penalties', () => {
    // 100 - (2*2) - (1*3) - (3*1) = 100 - 4 - 3 - 3 = 90
    expect(computeHealthScore(10, 2, 1, 3)).toBe(90);
  });
});

describe('auditDocs git dates', () => {
  function makeTempGitRepo(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-sentinel-audit-'));
    execSync('git init', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
    return dir;
  }

  it('assigns different git dates to files modified at different times', async () => {
    const dir = makeTempGitRepo();

    // Create docs dir and source files
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });

    // Commit file_a.ts first
    fs.writeFileSync(path.join(dir, 'src/file_a.ts'), 'export const a = 1;');
    execSync('git add -A && git commit -m "add file_a"', { cwd: dir, stdio: 'pipe' });

    // Wait 1s to ensure different timestamps, then commit file_b.ts
    const commitALog = execSync('git log -1 --format=%ct -- src/file_a.ts', { cwd: dir, encoding: 'utf-8' }).trim();

    fs.writeFileSync(path.join(dir, 'src/file_b.ts'), 'export const b = 2;');
    // Use --date to force a different commit timestamp
    execSync('git add -A && GIT_COMMITTER_DATE="2026-01-01T00:00:00Z" git commit -m "add file_b" --date="2026-01-01T00:00:00Z"', { cwd: dir, stdio: 'pipe' });

    // Create a doc referencing both files, with a very old last_verified so it's stale
    const docContent = [
      '---',
      'status: active',
      'category: general',
      'references:',
      '  - src/file_a.ts',
      '  - src/file_b.ts',
      'last_verified: "2020-01-01"',
      '---',
      '# My doc',
    ].join('\n');
    fs.writeFileSync(path.join(dir, 'docs/test.md'), docContent);
    execSync('git add -A && git commit -m "add doc"', { cwd: dir, stdio: 'pipe' });

    const result = await auditDocs(dir, {
      docsDir: './docs',
      ignore: [],
      staleThresholdDays: 1,
      archiveThresholdDays: 90,
    });

    // The doc should be stale and both refs should be listed as changed
    expect(result.staleDocs).toHaveLength(1);
    expect(result.staleDocs[0].changedReferences).toContain('src/file_a.ts');
    expect(result.staleDocs[0].changedReferences).toContain('src/file_b.ts');

    fs.rmSync(dir, { recursive: true });
  });

  it('does not give files the same date from a batch query', async () => {
    const dir = makeTempGitRepo();

    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });

    // Commit old file with an old date
    fs.writeFileSync(path.join(dir, 'src/old.ts'), 'export const old = 1;');
    execSync('git add -A && GIT_COMMITTER_DATE="2020-06-01T00:00:00Z" git commit -m "add old" --date="2020-06-01T00:00:00Z"', { cwd: dir, stdio: 'pipe' });

    // Commit new file with a recent date
    fs.writeFileSync(path.join(dir, 'src/new.ts'), 'export const n = 2;');
    execSync('git add -A && GIT_COMMITTER_DATE="2026-01-15T00:00:00Z" git commit -m "add new" --date="2026-01-15T00:00:00Z"', { cwd: dir, stdio: 'pipe' });

    // Doc referencing only the old file, verified after old but before new
    const docContent = [
      '---',
      'status: active',
      'category: general',
      'references:',
      '  - src/old.ts',
      'last_verified: "2025-01-01"',
      '---',
      '# Doc about old',
    ].join('\n');
    fs.writeFileSync(path.join(dir, 'docs/about-old.md'), docContent);
    execSync('git add -A && git commit -m "add doc"', { cwd: dir, stdio: 'pipe' });

    const result = await auditDocs(dir, {
      docsDir: './docs',
      ignore: [],
      staleThresholdDays: 1,
      archiveThresholdDays: 90,
    });

    // The doc is stale (>1 day since verified), but src/old.ts was NOT
    // changed after last_verified (2025-01-01), so changedReferences should be empty.
    // Before the fix, the batch query would assign src/new.ts's date to src/old.ts.
    const staleDoc = result.staleDocs.find((d) => d.docPath === 'docs/about-old.md');
    expect(staleDoc).toBeDefined();
    expect(staleDoc!.changedReferences).not.toContain('src/old.ts');
  });
});
