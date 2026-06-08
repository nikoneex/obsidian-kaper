import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Resolve the `obsidian` module to a js-yaml-backed stand-in for unit tests
// (the npm `obsidian` package ships types only). See test/obsidian-yaml-stub.ts.
export default defineConfig({
  test: {
    alias: {
      obsidian: fileURLToPath(new URL('./test/obsidian-yaml-stub.ts', import.meta.url)),
    },
  },
});
