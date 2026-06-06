# Obsidian Review Warnings

Snapshot of what the Obsidian plugin-review bot flags on the Kaper plugin, with
the ESLint rule each maps to and how we guard against it. Captured 2026-06-05
against `1.2.1`.

The guardrail is `npm run lint` (ESLint + [`eslint-plugin-obsidianmd`] +
[`typescript-eslint`]), enforced in CI. Run it locally before opening a PR; it
reproduces every category below so the review bot has nothing left to find.

[`eslint-plugin-obsidianmd`]: https://github.com/obsidianmd/eslint-plugin
[`typescript-eslint`]: https://typescript-eslint.io/

## Warnings (11)

### 1. Unsafe assignment of an `any` value (3)

- `src/main.ts:111`
- `src/recipe-id.ts:17`
- `src/recipe-id.ts:30`

Rule: `@typescript-eslint/no-unsafe-assignment`. A value typed `any` is assigned
to a typed target, defeating type-checking. Fix by typing the source —
frontmatter is `Record<string, unknown>`, narrow before use.

### 2. `js-yaml` should be replaced with an alternative package (2)

- `package.json:26`
- `src/parser/recipe-parser.ts:1`

Rule: `obsidianmd/prefer-builtin-yaml` (sample-plugin dependency guidance).
Obsidian ships a YAML parser; prefer `parseYaml` / `stringifyYaml` from the
`obsidian` module over bundling `js-yaml`. Removing it also shrinks `main.js`.

### 3. Unsafe member access `.kaper` on an `any` value (2)

- `src/recipe-id.ts:17`
- `src/recipe-id.ts:22`

Rule: `@typescript-eslint/no-unsafe-member-access`. Reading `.kaper` off an
`any` (the `processFrontMatter` callback arg / cache frontmatter). Fix by typing
the callback parameter as `Record<string, unknown>` and narrowing.

### 4. Use `window.requestAnimationFrame()` instead of `requestAnimationFrame()` (1)

- `src/file-label-rewriter.ts:64`

Rule: `obsidianmd/prefer-window-for-timers` (popout-window compatibility). Bare
globals resolve against the main window; in a popped-out window that's the wrong
document. Qualify with `window.` (or the relevant `activeWindow`/`win`).

### 5. Use `window.setTimeout()` instead of `activeWindow.setTimeout()` (1)

- `src/file-label-rewriter.ts:125`

Rule: `obsidianmd/prefer-window-for-timers`. Timer functions must use `window`,
not `activeWindow`, so the timer is owned by the correct global.

### 6. Use `window.setTimeout()` instead of `setTimeout()` (1)

- `src/ui/TagInput.tsx:107`

Rule: `obsidianmd/prefer-window-for-timers`. Same as above — qualify the bare
`setTimeout` with `window.` for popout-window compatibility.

### 7. README contains unfilled placeholder text (1)

- `README.md`

Rule: `obsidianmd/no-placeholder-readme`. Template leftovers (`[description]`,
`TODO`, sample-plugin boilerplate) must be replaced with real content describing
the plugin.

## Status

| # | Category                                   | Files | Status | Enforced by |
|---|--------------------------------------------|-------|--------|-------------|
| 1 | Unsafe assignment of `any`                 | 3     | ✅ fixed | `@typescript-eslint/no-unsafe-assignment` (error) |
| 2 | Replace `js-yaml`                           | 2     | ⚠️ tracked | `no-restricted-imports` (warn) |
| 3 | Unsafe member access on `any`              | 2     | ✅ fixed | `@typescript-eslint/no-unsafe-member-access` (error) |
| 4 | `window.requestAnimationFrame()`           | 1     | ✅ fixed | `obsidianmd/prefer-window-timers` (error) |
| 5 | `window.setTimeout()` (vs `activeWindow`)  | 1     | ✅ fixed | `obsidianmd/prefer-window-timers` (error) |
| 6 | `window.setTimeout()` (vs bare)            | 1     | ✅ fixed | `obsidianmd/prefer-window-timers` (error) |
| 7 | README placeholder text                    | 1     | ✅ clean | manual review (README is fully written; not reproducible) |

`npm run lint` is now wired into CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml))
and runs green: **0 errors, 1 warning**. The remaining warning is the `js-yaml`
migration (#2) — it stays a `warn` rather than `error` so it surfaces on every
run without blocking, because moving the parser to Obsidian's `parseYaml` /
`stringifyYaml` touches the vitest mocks and is best done as its own change.

The recommended `eslint-plugin-obsidianmd` ruleset enforces far more than the
seven items above (e.g. `no-unsupported-api`, which caught the 1.4.4 issue in
[recipe-id.ts](../src/recipe-id.ts) that triggered the 1.2.1 hotfix). Run
`npm run lint` locally before opening a PR; `npm run lint:fix` auto-fixes what it
can. Categories the linter can't see — #7 README placeholders — stay a manual
pre-submission check.
