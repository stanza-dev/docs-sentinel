import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
  },
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    clean: false,
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
    outExtension() {
      return { js: '.cjs' };
    },
    define: {
      'PKG_VERSION': JSON.stringify(version),
    },
  },
]);
