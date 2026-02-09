// Public API
export { scanDocs, scanDocsWithRefs } from './core/scanner.js';
export { checkFile, buildReferenceIndex } from './core/checker.js';
export { auditDocs, computeHealthScore } from './core/auditor.js';
export {
  parseFrontmatter,
  generateFrontmatter,
  mergeFrontmatter,
  inferCategory,
  inferFeature,
} from './core/frontmatter.js';
export {
  extractReferences,
  validateReferences,
  findDocsReferencingFile,
  normalizeRef,
} from './core/references.js';

// Types
export type {
  DocStatus,
  DocCategory,
  DocFrontmatter,
  ScannedDoc,
  CheckResult,
  AffectedDoc,
  AuditResult,
  StaleDoc,
  OrphanedRef,
  DocsSentinelConfig,
  DetectedTool,
  ToolName,
  InitResult,
  ReportFormat,
} from './types.js';
