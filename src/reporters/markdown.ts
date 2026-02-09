import type { AuditResult } from '../types.js';

export function formatAuditMarkdown(result: AuditResult): string {
  const lines: string[] = [];

  lines.push(`# Documentation Health Report`);
  lines.push('');
  lines.push(`**Health Score:** ${result.healthScore}/100`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total docs | ${result.totalDocs} |`);
  lines.push(`| With frontmatter | ${result.docsWithFrontmatter} |`);
  lines.push(`| Without frontmatter | ${result.docsWithoutFrontmatter.length} |`);
  lines.push(`| Stale | ${result.staleDocs.length} |`);
  lines.push(`| Orphaned refs | ${result.orphanedRefs.length} |`);
  lines.push(`| Archivable | ${result.archivableDocs.length} |`);

  // Stale docs
  if (result.staleDocs.length > 0) {
    lines.push('');
    lines.push('## Stale Documents');
    lines.push('');
    lines.push('| Document | Last Verified | Days | Changed References |');
    lines.push('|----------|---------------|------|--------------------|');
    for (const doc of result.staleDocs) {
      const changed =
        doc.changedReferences.length > 0
          ? doc.changedReferences.map((r) => `\`${r}\``).join(', ')
          : '—';
      lines.push(
        `| ${doc.docPath} | ${doc.lastVerified} | ${doc.daysSinceVerified} | ${changed} |`,
      );
    }
  }

  // Orphaned refs
  if (result.orphanedRefs.length > 0) {
    lines.push('');
    lines.push('## Orphaned References');
    lines.push('');
    lines.push('| Document | Missing Reference |');
    lines.push('|----------|-------------------|');
    for (const ref of result.orphanedRefs) {
      lines.push(`| ${ref.docPath} | \`${ref.missingRef}\` |`);
    }
  }

  // Missing frontmatter
  if (result.docsWithoutFrontmatter.length > 0) {
    lines.push('');
    lines.push('## Missing Frontmatter');
    lines.push('');
    for (const doc of result.docsWithoutFrontmatter) {
      lines.push(`- ${doc}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
