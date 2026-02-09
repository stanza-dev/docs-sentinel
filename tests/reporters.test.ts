import { describe, it, expect } from 'vitest';
import { formatCheckTerminal, formatAuditTerminal } from '../src/reporters/terminal.js';
import { formatCheckJson, formatAuditJson } from '../src/reporters/json.js';
import { formatAuditMarkdown } from '../src/reporters/markdown.js';
import type { CheckResult, AuditResult } from '../src/types.js';

const checkResult: CheckResult = {
  sourceFile: 'src/auth/auth.service.ts',
  affectedDocs: [
    {
      docPath: 'docs/feat-auth/PLAN.md',
      lastVerified: '2025-01-01',
      daysSinceVerified: 60,
      status: 'active',
    },
  ],
};

const emptyCheckResult: CheckResult = {
  sourceFile: 'src/other.ts',
  affectedDocs: [],
};

const auditResult: AuditResult = {
  totalDocs: 10,
  docsWithFrontmatter: 8,
  docsWithoutFrontmatter: ['docs/a.md', 'docs/b.md'],
  staleDocs: [
    {
      docPath: 'docs/old.md',
      lastVerified: '2024-06-01',
      daysSinceVerified: 200,
      changedReferences: ['src/foo.ts'],
    },
  ],
  orphanedRefs: [{ docPath: 'docs/broken.md', missingRef: 'src/deleted.ts' }],
  archivableDocs: ['docs/done.md'],
  healthScore: 75,
};

describe('terminal reporter', () => {
  it('returns empty for no matches', () => {
    expect(formatCheckTerminal(emptyCheckResult)).toBe('');
  });

  it('formats check result with affected docs', () => {
    const output = formatCheckTerminal(checkResult);
    expect(output).toContain('1 doc(s)');
    expect(output).toContain('PLAN.md');
  });

  it('formats audit result with sections', () => {
    const output = formatAuditTerminal(auditResult);
    expect(output).toContain('75');
    expect(output).toContain('Total docs: 10');
    expect(output).toContain('Stale');
    expect(output).toContain('Orphaned');
  });
});

describe('json reporter', () => {
  it('outputs valid JSON for check', () => {
    const json = formatCheckJson(checkResult);
    const parsed = JSON.parse(json);
    expect(parsed.sourceFile).toBe('src/auth/auth.service.ts');
    expect(parsed.affectedDocs).toHaveLength(1);
  });

  it('outputs valid JSON for audit', () => {
    const json = formatAuditJson(auditResult);
    const parsed = JSON.parse(json);
    expect(parsed.healthScore).toBe(75);
  });
});

describe('markdown reporter', () => {
  it('outputs markdown with tables', () => {
    const md = formatAuditMarkdown(auditResult);
    expect(md).toContain('# Documentation Health Report');
    expect(md).toContain('| Total docs | 10 |');
    expect(md).toContain('## Stale Documents');
    expect(md).toContain('## Orphaned References');
  });
});
