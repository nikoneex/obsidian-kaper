import esbuild from 'esbuild';
import process from 'process';
import { builtinModules as builtins } from 'node:module';

const prod = process.argv[2] === 'production';

const scripts = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins,
  ],
  format: 'cjs',
  target: 'es2020',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  jsx: 'automatic',
  minify: prod,
  banner: {
    js: '/*! Kaper for Obsidian (C) 2026 nikoneex and contributors. GPL-3.0-only with Obsidian linking exception. Source and license: https://github.com/nikoneex/obsidian-kaper */',
  },
});

// Obsidian loads a single styles.css from the plugin root; the source is split
// across src/styles and bundled here (unminified, so themes can read it).
const styles = await esbuild.context({
  entryPoints: ['src/styles/index.css'],
  bundle: true,
  logLevel: 'info',
  outfile: 'styles.css',
  banner: {
    css: '/*! Kaper for Obsidian (C) 2026 nikoneex and contributors. GPL-3.0-only with Obsidian linking exception. Source and license: https://github.com/nikoneex/obsidian-kaper */',
  },
});

const contexts = [scripts, styles];

if (prod) {
  await Promise.all(contexts.map((c) => c.rebuild()));
  process.exit(0);
} else {
  await Promise.all(contexts.map((c) => c.watch()));
}
