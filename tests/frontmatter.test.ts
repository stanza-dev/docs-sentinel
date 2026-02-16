import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseFrontmatter,
  generateFrontmatter,
  serializeFrontmatter,
  mergeFrontmatter,
  inferCategory,
  inferFeature,
} from '../src/core/frontmatter.js';
import { runInit } from '../src/commands/init.js';

describe('parseFrontmatter', () => {
  it('parses valid docs-sentinel frontmatter', () => {
    const raw = [
      '---',
      'status: active',
      'category: ticket',
      'references:',
      '  - src/auth/auth.service.ts',
      'last_verified: "2025-01-15"',
      '---',
      '# Content',
    ].join('\n');

    const result = parseFrontmatter(raw);
    expect(result.isValid).toBe(true);
    expect(result.frontmatter?.status).toBe('active');
    expect(result.frontmatter?.category).toBe('ticket');
    expect(result.frontmatter?.references).toEqual([
      'src/auth/auth.service.ts',
    ]);
  });

  it('returns isValid=false but hasYamlFrontmatter=true for non-sentinel frontmatter', () => {
    const raw = [
      '---',
      'title: My Doc',
      'layout: default',
      '---',
      '# Content',
    ].join('\n');

    const result = parseFrontmatter(raw);
    expect(result.isValid).toBe(false);
    expect(result.hasYamlFrontmatter).toBe(true);
  });

  it('returns isValid=false for TOML frontmatter', () => {
    const raw = ['+++', 'title = "My Doc"', '+++', '# Content'].join('\n');

    const result = parseFrontmatter(raw);
    expect(result.isValid).toBe(false);
  });

  it('returns hasYamlFrontmatter=false for no frontmatter', () => {
    const raw = '# Just a heading\n\nSome content.';
    const result = parseFrontmatter(raw);
    expect(result.isValid).toBe(false);
    expect(result.hasYamlFrontmatter).toBe(false);
  });

  it('parses namespaced frontmatter with frontmatterKey', () => {
    const raw = [
      '---',
      'title: My Doc',
      'docs_sentinel:',
      '  status: active',
      '  references:',
      '    - src/foo.ts',
      '  last_verified: "2025-06-01"',
      '---',
      '# Content',
    ].join('\n');

    const result = parseFrontmatter(raw, {
      docsDir: './docs',
      ignore: [],
      staleThresholdDays: 30,
      archiveThresholdDays: 90,
      frontmatterKey: 'docs_sentinel',
    });

    expect(result.isValid).toBe(true);
    expect(result.frontmatter?.status).toBe('active');
    expect(result.frontmatter?.references).toEqual(['src/foo.ts']);
  });

  it('handles horizontal rule (---) as no frontmatter', () => {
    const raw = '---\n\n# Content\n\n---\n\nMore content';
    const result = parseFrontmatter(raw);
    expect(result.isValid).toBe(false);
  });
});

describe('generateFrontmatter', () => {
  it('generates frontmatter with inferred category', () => {
    const fm = generateFrontmatter(
      'docs/feat-auth/T-01.md',
      '# Ticket',
      ['src/auth/auth.service.ts'],
    );
    expect(fm.status).toBe('active');
    expect(fm.category).toBe('ticket');
    expect(fm.feature).toBe('auth');
    expect(fm.references).toEqual(['src/auth/auth.service.ts']);
    expect(fm.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('mergeFrontmatter', () => {
  it('preserves existing user fields and adds sentinel fields', () => {
    const raw = [
      '---',
      'title: My Doc',
      'layout: default',
      '---',
      '# Content',
    ].join('\n');

    const result = mergeFrontmatter(raw, ['src/foo.ts']);
    expect(result).toContain('title: My Doc');
    expect(result).toContain('layout: default');
    expect(result).toContain('status: active');
    expect(result).toContain('src/foo.ts');
  });

  it('preserves existing references when new refs are empty', () => {
    const raw = [
      '---',
      'status: active',
      'references:',
      '  - src/old.ts',
      'last_verified: "2025-01-01"',
      '---',
      '# Content',
    ].join('\n');

    const result = mergeFrontmatter(raw, []);
    expect(result).toContain('src/old.ts');
  });
});

describe('inferCategory', () => {
  it('infers ticket from T-XX pattern', () => {
    expect(inferCategory('docs/T-01.md', '')).toBe('ticket');
  });

  it('infers feature-plan from PLAN', () => {
    expect(inferCategory('docs/feat-auth/PLAN.md', '')).toBe('feature-plan');
  });

  it('infers architecture from ARCHITECTURE', () => {
    expect(inferCategory('docs/ARCHITECTURE.md', '')).toBe('architecture');
  });

  it('defaults to general', () => {
    expect(inferCategory('docs/random.md', '')).toBe('general');
  });
});

describe('inferFeature', () => {
  it('extracts feature from feat-X directory', () => {
    expect(inferFeature('docs/feat-user-retention/PLAN.md')).toBe(
      'user-retention',
    );
  });

  it('returns undefined when no feature directory', () => {
    expect(inferFeature('docs/README.md')).toBeUndefined();
  });
});

describe('serializeFrontmatter', () => {
  it('strips undefined values before serializing', () => {
    const data = { status: 'active', feature: undefined, category: 'general' };
    const result = serializeFrontmatter(data as Record<string, unknown>, '# Content');
    expect(result).toContain('status: active');
    expect(result).toContain('category: general');
    expect(result).not.toContain('feature');
  });
});

describe('init preserves existing frontmatter', () => {
  function makeTempProject(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-sentinel-fm-'));
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    // Create a .git dir so findProjectRoot works
    fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
    return dir;
  }

  it('preserves title and layout when adding docs-sentinel fields', async () => {
    const dir = makeTempProject();

    const docContent = [
      '---',
      'title: My Hugo Doc',
      'layout: default',
      '---',
      '# Content',
    ].join('\n');
    fs.writeFileSync(path.join(dir, 'docs/my-doc.md'), docContent);

    await runInit(dir, { tools: false });

    const result = fs.readFileSync(path.join(dir, 'docs/my-doc.md'), 'utf-8');
    expect(result).toContain('title: My Hugo Doc');
    expect(result).toContain('layout: default');
    expect(result).toContain('status: active');

    fs.rmSync(dir, { recursive: true });
  });

  it('does not lose frontmatter for Astro/Jekyll docs without frontmatterKey', async () => {
    const dir = makeTempProject();

    const docContent = [
      '---',
      'title: Getting Started',
      'sidebar_position: 1',
      'description: How to get started',
      '---',
      '# Getting Started',
      '',
      'Welcome to the project.',
    ].join('\n');
    fs.writeFileSync(path.join(dir, 'docs/getting-started.md'), docContent);

    await runInit(dir, { tools: false });

    const result = fs.readFileSync(path.join(dir, 'docs/getting-started.md'), 'utf-8');
    expect(result).toContain('title: Getting Started');
    expect(result).toContain('sidebar_position: 1');
    expect(result).toContain('description: How to get started');
    expect(result).toContain('status: active');

    fs.rmSync(dir, { recursive: true });
  });
});
