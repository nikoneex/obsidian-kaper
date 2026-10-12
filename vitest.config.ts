import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Resolve the `obsidian` module to a js-yaml-backed stand-in for unit tests
// (the npm `obsidian` package ships types only). See test/stubs/obsidian.ts.
export default defineConfig({
  test: {
    alias: {
      obsidian: fileURLToPath(new URL('./test/stubs/obsidian.ts', import.meta.url)),
    },
  },
});
