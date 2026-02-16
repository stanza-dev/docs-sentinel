export type DocStatus = 'active' | 'completed' | 'deprecated';

export type DocCategory =
  | 'ticket'
  | 'feature-plan'
  | 'architecture'
  | 'strategy'
  | 'skill'
  | 'general';

export interface DocFrontmatter {
  status: DocStatus;
  category: DocCategory;
  feature?: string;
  references: string[];
  last_verified: string;
}

export interface ScannedDoc {
  filePath: string;
  relativePath: string;
  hasFrontmatter: boolean;
  hasYamlFrontmatter: boolean;
  frontmatter: DocFrontmatter | null;
  content: string;
  rawContent: string;
}

export interface CheckResult {
  sourceFile: string;
  affectedDocs: AffectedDoc[];
}

export interface AffectedDoc {
  docPath: string;
  lastVerified: string;
  daysSinceVerified: number;
  status: DocStatus;
}

export interface AuditResult {
  totalDocs: number;
  docsWithFrontmatter: number;
  docsWithoutFrontmatter: string[];
  staleDocs: StaleDoc[];
  orphanedRefs: OrphanedRef[];
  archivableDocs: string[];
  healthScore: number;
}

export interface StaleDoc {
  docPath: string;
  lastVerified: string;
  daysSinceVerified: number;
  changedReferences: string[];
}

export interface OrphanedRef {
  docPath: string;
  missingRef: string;
}

export interface DocsSentinelConfig {
  docsDir: string;
  ignore: string[];
  staleThresholdDays: number;
  archiveThresholdDays: number;
  pathPrefixes?: string[];
  sourceExtensions?: string[];
  frontmatterKey?: string | null;
  maxFileSize?: number;
}

export type ToolName = 'claude-code' | 'cursor' | 'vscode' | 'husky';

export interface DetectedTool {
  name: ToolName;
  detected: boolean;
  configPath: string;
}

export interface InitResult {
  docsScanned: number;
  frontmatterAdded: number;
  frontmatterSkipped: number;
  toolsConfigured: string[];
  configCreated: boolean;
}

export type ReportFormat = 'terminal' | 'json' | 'markdown';
