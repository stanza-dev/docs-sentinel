import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanDocs, scanDocsWithRefs } from '../src/core/scanner.js';
import type { DocsSentinelConfig } from '../src/types.js';

const FIXTURE_ROOT = path.resolve(__dirname, 'fixtures/sample-project');

const TEST_CONFIG: DocsSentinelConfig = {
  docsDir: './docs',
  ignore: [],
  staleThresholdDays: 30,
  archiveThresholdDays: 90,
};

describe('scanDocs', () => {
  it('finds all markdown files in docs dir', async () => {
    const docs = await scanDocs(FIXTURE_ROOT, TEST_CONFIG);
    expect(docs.length).toBeGreaterThanOrEqual(3);
  });

  it('correctly identifies docs with frontmatter', async () => {
    const docs = await scanDocs(FIXTURE_ROOT, TEST_CONFIG);
    const withFm = docs.filter((d) => d.hasFrontmatter);
    const withoutFm = docs.filter((d) => !d.hasFrontmatter);
    expect(withFm.length).toBeGreaterThanOrEqual(2);
    expect(withoutFm.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for non-existent docs dir', async () => {
    const docs = await scanDocs(FIXTURE_ROOT, {
      ...TEST_CONFIG,
      docsDir: './nonexistent',
    });
    expect(docs).toHaveLength(0);
  });
});

describe('scanDocsWithRefs', () => {
  it('only returns docs with valid frontmatter and references', async () => {
    const docs = await scanDocsWithRefs(FIXTURE_ROOT, TEST_CONFIG);
    for (const doc of docs) {
      expect(doc.hasFrontmatter).toBe(true);
      expect(doc.frontmatter!.references.length).toBeGreaterThan(0);
    }
  });
});
