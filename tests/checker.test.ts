import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { checkFile, buildReferenceIndex } from '../src/core/checker.js';
import type { ScannedDoc, DocsSentinelConfig } from '../src/types.js';

const FIXTURE_ROOT = path.resolve(__dirname, 'fixtures/sample-project');

const TEST_CONFIG: DocsSentinelConfig = {
  docsDir: './docs',
  ignore: [],
  staleThresholdDays: 30,
  archiveThresholdDays: 90,
};

describe('buildReferenceIndex', () => {
  const docs: ScannedDoc[] = [
    {
      filePath: '/docs/a.md',
      relativePath: 'docs/a.md',
      hasFrontmatter: true,
      frontmatter: {
        status: 'active',
        category: 'general',
        references: ['src/auth/auth.service.ts', 'src/users/users.service.ts'],
        last_verified: '2025-01-01',
      },
      content: '',
      rawContent: '',
    },
    {
      filePath: '/docs/b.md',
      relativePath: 'docs/b.md',
      hasFrontmatter: true,
      frontmatter: {
        status: 'active',
        category: 'ticket',
        references: ['src/auth/auth.service.ts'],
        last_verified: '2025-06-01',
      },
      content: '',
      rawContent: '',
    },
  ];

  it('creates index with correct entries', () => {
    const index = buildReferenceIndex(docs);
    expect(index.get('src/auth/auth.service.ts')).toHaveLength(2);
    expect(index.get('src/users/users.service.ts')).toHaveLength(1);
  });

  it('returns undefined for unknown files', () => {
    const index = buildReferenceIndex(docs);
    expect(index.get('src/unknown.ts')).toBeUndefined();
  });
});

describe('checkFile', () => {
  it('finds docs referencing a source file', async () => {
    const result = await checkFile(
      'src/auth/auth.service.ts',
      FIXTURE_ROOT,
      TEST_CONFIG,
    );
    expect(result.affectedDocs.length).toBeGreaterThanOrEqual(1);
    expect(result.affectedDocs.some((d) => d.docPath.includes('PLAN'))).toBe(
      true,
    );
  });

  it('returns empty for non-referenced files', async () => {
    const result = await checkFile(
      'src/nonexistent/file.ts',
      FIXTURE_ROOT,
      TEST_CONFIG,
    );
    expect(result.affectedDocs).toHaveLength(0);
  });
});
