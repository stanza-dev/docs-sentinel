import matter from 'gray-matter';
import type {
  DocFrontmatter,
  DocCategory,
  DocsSentinelConfig,
} from '../types.js';
import {
  CATEGORY_KEYWORDS,
  FEATURE_DIR_PATTERN,
} from '../constants.js';

interface ParseResult {
  frontmatter: DocFrontmatter | null;
  content: string;
  isValid: boolean;
  hasYamlFrontmatter: boolean;
}

export function parseFrontmatter(
  rawContent: string,
  config?: DocsSentinelConfig,
): ParseResult {
  // Detect TOML frontmatter (not supported)
  if (rawContent.startsWith('+++')) {
    return { frontmatter: null, content: rawContent, isValid: false, hasYamlFrontmatter: false };
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(rawContent);
  } catch {
    return { frontmatter: null, content: rawContent, isValid: false, hasYamlFrontmatter: false };
  }

  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    return { frontmatter: null, content: parsed.content, isValid: false, hasYamlFrontmatter: false };
  }

  const key = config?.frontmatterKey;
  const data = key ? (parsed.data[key] as Record<string, unknown>) : parsed.data;

  if (!data) {
    return { frontmatter: null, content: parsed.content, isValid: false, hasYamlFrontmatter: true };
  }

  // Validate shape: must have status or references to be considered ours
  if (!data.status && !data.references) {
    return { frontmatter: null, content: parsed.content, isValid: false, hasYamlFrontmatter: true };
  }

  const fm: DocFrontmatter = {
    status: (data.status as DocFrontmatter['status']) ?? 'active',
    category: (data.category as DocCategory) ?? 'general',
    references: Array.isArray(data.references) ? data.references : [],
    last_verified: typeof data.last_verified === 'string' ? data.last_verified : new Date().toISOString().split('T')[0],
  };

  if (data.feature && typeof data.feature === 'string') {
    fm.feature = data.feature;
  }

  return { frontmatter: fm, content: parsed.content, isValid: true, hasYamlFrontmatter: true };
}

export function generateFrontmatter(
  relativePath: string,
  content: string,
  extractedRefs: string[],
): DocFrontmatter {
  return {
    status: 'active',
    category: inferCategory(relativePath, content),
    feature: inferFeature(relativePath),
    references: extractedRefs,
    last_verified: new Date().toISOString().split('T')[0],
  };
}

export function mergeFrontmatter(
  existingRaw: string,
  newRefs: string[],
  config?: DocsSentinelConfig,
): string {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(existingRaw);
  } catch {
    return existingRaw;
  }

  const key = config?.frontmatterKey;
  const allData = { ...parsed.data };

  if (key) {
    const existing = (allData[key] as Record<string, unknown>) ?? {};
    allData[key] = {
      ...existing,
      status: existing.status ?? 'active',
      category: existing.category ?? 'general',
      references: newRefs.length > 0 ? newRefs : (existing.references ?? []),
      last_verified: new Date().toISOString().split('T')[0],
    };
  } else {
    allData.status = allData.status ?? 'active';
    allData.category = allData.category ?? 'general';
    allData.references = newRefs.length > 0 ? newRefs : (allData.references ?? []);
    allData.last_verified = new Date().toISOString().split('T')[0];
  }

  return serializeFrontmatter(allData, parsed.content);
}

export function serializeFrontmatter(
  data: Record<string, unknown>,
  bodyContent: string,
): string {
  const cleaned = JSON.parse(JSON.stringify(data));
  const result = matter.stringify(bodyContent, cleaned);
  return result;
}

export function inferCategory(
  relativePath: string,
  content: string,
): DocCategory {
  const filename = relativePath.split('/').pop() ?? '';

  // Check filename patterns
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (filename.includes(keyword)) {
      return category;
    }
  }

  // Check directory patterns
  const lowerPath = relativePath.toLowerCase();
  if (lowerPath.includes('/ticket') || /\/T-\d+/.test(relativePath)) {
    return 'ticket';
  }

  // Check first few lines of content
  const firstLines = content.slice(0, 500).toLowerCase();
  if (firstLines.includes('## ticket') || firstLines.includes('# ticket')) {
    return 'ticket';
  }
  if (firstLines.includes('## architecture') || firstLines.includes('# adr')) {
    return 'architecture';
  }

  return 'general';
}

export function inferFeature(relativePath: string): string | undefined {
  const match = relativePath.match(FEATURE_DIR_PATTERN);
  if (match) {
    return match[1];
  }
  return undefined;
}
