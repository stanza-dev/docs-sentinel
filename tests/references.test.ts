import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  extractReferences,
  validateReferences,
  normalizeRef,
  findDocsReferencingFile,
} from '../src/core/references.js';
import type { ScannedDoc } from '../src/types.js';

const FIXTURE_ROOT = path.resolve(__dirname, 'fixtures/sample-project');

describe('extractReferences', () => {
  it('extracts backtick-wrapped paths', () => {
    const content = 'See `src/auth/auth.service.ts` for details.';
    const refs = extractReferences(content);
    expect(refs).toContain('src/auth/auth.service.ts');
  });

  it('extracts bare paths with known prefixes', () => {
    const content = 'The file src/users/users.service.ts handles users.';
    const refs = extractReferences(content);
    expect(refs).toContain('src/users/users.service.ts');
  });

  it('extracts markdown link paths', () => {
    const content = 'See [auth service](src/auth/auth.service.ts) for details.';
    const refs = extractReferences(content);
    expect(refs).toContain('src/auth/auth.service.ts');
  });

  it('strips fenced code blocks before extraction', () => {
    const content = [
      'Some text',
      '```typescript',
      'import { foo } from "src/fake/file.ts";',
      '```',
      'Real ref: `src/auth/auth.service.ts`',
    ].join('\n');
    const refs = extractReferences(content);
    expect(refs).toContain('src/auth/auth.service.ts');
    expect(refs).not.toContain('src/fake/file.ts');
  });

  it('strips URLs before extraction', () => {
    const content =
      'See https://github.com/user/repo/blob/main/src/auth/auth.service.ts for details.\n' +
      'Also `src/users/users.service.ts`.';
    const refs = extractReferences(content);
    expect(refs).not.toContain('src/auth/auth.service.ts');
    expect(refs).toContain('src/users/users.service.ts');
  });

  it('strips box-drawing lines', () => {
    const content = [
      '```',
      '```',
      '├── src/fake/tree.ts',
      '└── src/fake/leaf.ts',
      '',
      'Real: `src/auth/auth.service.ts`',
    ].join('\n');
    const refs = extractReferences(content);
    expect(refs).toContain('src/auth/auth.service.ts');
    expect(refs).not.toContain('src/fake/tree.ts');
    expect(refs).not.toContain('src/fake/leaf.ts');
  });

  it('filters out template paths with braces', () => {
    const content = 'Pattern: `src/{domain}/{domain}.service.ts`';
    const refs = extractReferences(content);
    expect(refs).toHaveLength(0);
  });

  it('filters by known extensions', () => {
    const content = '`src/readme.txt` and `src/auth/auth.service.ts`';
    const refs = extractReferences(content);
    expect(refs).not.toContain('src/readme.txt');
    expect(refs).toContain('src/auth/auth.service.ts');
  });

  it('deduplicates references', () => {
    const content =
      '`src/auth/auth.service.ts` and also src/auth/auth.service.ts mentioned again.';
    const refs = extractReferences(content);
    const authRefs = refs.filter((r) => r === 'src/auth/auth.service.ts');
    expect(authRefs).toHaveLength(1);
  });

  it('handles MDX import/export lines', () => {
    const content = [
      'import { Foo } from "src/components/foo.tsx"',
      'export const meta = {}',
      '',
      'See `src/auth/auth.service.ts`',
    ].join('\n');
    const refs = extractReferences(content);
    expect(refs).toContain('src/auth/auth.service.ts');
    expect(refs).not.toContain('src/components/foo.tsx');
  });

  it('handles Go path prefixes', () => {
    const content = 'See `cmd/server/main.go` and `internal/auth/handler.go`';
    const refs = extractReferences(content);
    expect(refs).toContain('cmd/server/main.go');
    expect(refs).toContain('internal/auth/handler.go');
  });
});

describe('validateReferences', () => {
  it('separates existing from missing files', () => {
    const refs = ['src/auth/auth.service.ts', 'src/nonexistent.ts'];
    const result = validateReferences(FIXTURE_ROOT, refs);
    expect(result.existing).toContain('src/auth/auth.service.ts');
    expect(result.missing).toContain('src/nonexistent.ts');
  });
});

describe('normalizeRef', () => {
  it('strips leading ./', () => {
    expect(normalizeRef('./src/foo.ts')).toBe('src/foo.ts');
  });

  it('strips leading /', () => {
    expect(normalizeRef('/src/foo.ts')).toBe('src/foo.ts');
  });

  it('passes through normal paths', () => {
    expect(normalizeRef('src/foo.ts')).toBe('src/foo.ts');
  });
});

describe('findDocsReferencingFile', () => {
  const docs: ScannedDoc[] = [
    {
      filePath: '/abs/docs/PLAN.md',
      relativePath: 'docs/PLAN.md',
      hasFrontmatter: true,
      frontmatter: {
        status: 'active',
        category: 'feature-plan',
        references: ['src/auth/auth.service.ts'],
        last_verified: '2025-01-01',
      },
      content: '',
      rawContent: '',
    },
    {
      filePath: '/abs/docs/other.md',
      relativePath: 'docs/other.md',
      hasFrontmatter: true,
      frontmatter: {
        status: 'active',
        category: 'general',
        references: ['src/users/users.service.ts'],
        last_verified: '2025-06-01',
      },
      content: '',
      rawContent: '',
    },
  ];

  it('finds docs referencing a source file', () => {
    const result = findDocsReferencingFile('src/auth/auth.service.ts', docs);
    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe('docs/PLAN.md');
  });

  it('returns empty for unmatched files', () => {
    const result = findDocsReferencingFile('src/other/file.ts', docs);
    expect(result).toHaveLength(0);
  });
});
