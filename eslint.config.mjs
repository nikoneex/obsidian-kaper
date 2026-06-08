import obsidianmd from 'eslint-plugin-obsidianmd';

// Guardrail against the checks the Obsidian plugin-review bot runs.
// See docs/obsidian-review-warnings.md for the catalogue this enforces.
export default [
  {
    // Build output and tooling scripts are not plugin source — don't lint them.
    ignores: ['main.js', 'node_modules/**', '*.mjs'],
  },

  // Official Obsidian ruleset: no-unsupported-api, prefer-window-timers,
  // validate-manifest, plus typescript-eslint type-checked (no-unsafe-*, etc.).
  ...obsidianmd.configs.recommended,

  {
    // The type-checked rules (no-unsafe-*, no-floating-promises, …) need a TS
    // program. projectService auto-discovers tsconfig.json for each file.
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // TypeScript already resolves identifiers (incl. the React UMD global);
      // core no-undef only produces false positives on typed code.
      'no-undef': 'off',

      // Obsidian ships a YAML parser (parseYaml/stringifyYaml from 'obsidian');
      // the review bot flags bundling js-yaml. The parser now uses the built-in
      // engine (src/parser/yaml-engine.ts), so this is an error to keep js-yaml
      // out of shipped code. The test stub (test/obsidian-yaml-stub.ts) lives
      // outside src/ and is not governed by this rule.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'js-yaml',
              message: "Use parseYaml/stringifyYaml from 'obsidian' instead of bundling js-yaml.",
            },
          ],
        },
      ],
    },
  },
];
