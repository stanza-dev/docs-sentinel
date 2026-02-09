import pc from 'picocolors';
import type { CheckResult, AuditResult } from '../types.js';

export function formatCheckTerminal(result: CheckResult): string {
  if (result.affectedDocs.length === 0) return '';

  const lines: string[] = [];
  lines.push(
    pc.yellow(`docs-sentinel: ${result.affectedDocs.length} doc(s) reference ${result.sourceFile}`),
  );

  for (const doc of result.affectedDocs) {
    const staleness =
      doc.daysSinceVerified > 30
        ? pc.red(`${doc.daysSinceVerified}d ago`)
        : doc.daysSinceVerified > 14
          ? pc.yellow(`${doc.daysSinceVerified}d ago`)
          : pc.green(`${doc.daysSinceVerified}d ago`);

    lines.push(`  ${pc.cyan(doc.docPath)} (verified ${staleness})`);
  }

  return lines.join('\n');
}

export function formatAuditTerminal(result: AuditResult): string {
  const lines: string[] = [];

  // Health score
  const scoreColor =
    result.healthScore >= 80
      ? pc.green
      : result.healthScore >= 50
        ? pc.yellow
        : pc.red;
  lines.push('');
  lines.push(pc.bold(`Documentation Health Score: ${scoreColor(String(result.healthScore))}/100`));
  lines.push('');

  // Summary
  lines.push(pc.bold('Summary'));
  lines.push(`  Total docs: ${result.totalDocs}`);
  lines.push(`  With frontmatter: ${result.docsWithFrontmatter}`);
  lines.push(`  Without frontmatter: ${result.docsWithoutFrontmatter.length}`);
  lines.push(`  Stale: ${result.staleDocs.length}`);
  lines.push(`  Orphaned refs: ${result.orphanedRefs.length}`);
  lines.push(`  Archivable: ${result.archivableDocs.length}`);

  // Stale docs
  if (result.staleDocs.length > 0) {
    lines.push('');
    lines.push(pc.bold(pc.yellow('Stale Documents')));
    for (const doc of result.staleDocs) {
      lines.push(
        `  ${pc.cyan(doc.docPath)} — verified ${pc.red(`${doc.daysSinceVerified}d ago`)}`,
      );
      if (doc.changedReferences.length > 0) {
        lines.push(
          `    Changed: ${doc.changedReferences.map((r) => pc.dim(r)).join(', ')}`,
        );
      }
    }
  }

  // Orphaned references
  if (result.orphanedRefs.length > 0) {
    lines.push('');
    lines.push(pc.bold(pc.red('Orphaned References')));
    for (const ref of result.orphanedRefs) {
      lines.push(`  ${pc.cyan(ref.docPath)} → ${pc.red(ref.missingRef)}`);
    }
  }

  // Missing frontmatter
  if (result.docsWithoutFrontmatter.length > 0) {
    lines.push('');
    lines.push(pc.bold(pc.dim('Missing Frontmatter')));
    for (const doc of result.docsWithoutFrontmatter) {
      lines.push(`  ${pc.dim(doc)}`);
    }
  }

  // Archivable
  if (result.archivableDocs.length > 0) {
    lines.push('');
    lines.push(pc.bold(pc.dim('Archivable Documents')));
    for (const doc of result.archivableDocs) {
      lines.push(`  ${pc.dim(doc)}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
