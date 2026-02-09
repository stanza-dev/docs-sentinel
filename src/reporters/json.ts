import type { CheckResult, AuditResult } from '../types.js';

export function formatCheckJson(result: CheckResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatAuditJson(result: AuditResult): string {
  return JSON.stringify(result, null, 2);
}
