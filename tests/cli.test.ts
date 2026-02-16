import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('cli version', () => {
  it('does not contain a hardcoded version string', () => {
    const cliSource = fs.readFileSync(
      path.resolve(__dirname, '../src/cli.ts'),
      'utf-8',
    );
    // Should use PKG_VERSION, not a hardcoded semver like .version('0.1.0')
    expect(cliSource).not.toMatch(/\.version\(['"][0-9]/);
    expect(cliSource).toContain('.version(PKG_VERSION)');
  });

  it('built cli outputs the package.json version', () => {
    const cliBundle = fs.readFileSync(
      path.resolve(__dirname, '../dist/cli.cjs'),
      'utf-8',
    );
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
    );
    expect(cliBundle).toContain(pkg.version);
  });
});
