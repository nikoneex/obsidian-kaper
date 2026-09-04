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
| 2 | Replace `js-yaml`                           | 2     | ✅ fixed | `no-restricted-imports` (error) |
| 3 | Unsafe member access on `any`              | 2     | ✅ fixed | `@typescript-eslint/no-unsafe-member-access` (error) |
| 4 | `window.requestAnimationFrame()`           | 1     | ✅ fixed | `obsidianmd/prefer-window-timers` (error) |
| 5 | `window.setTimeout()` (vs `activeWindow`)  | 1     | ✅ fixed | `obsidianmd/prefer-window-timers` (error) |
| 6 | `window.setTimeout()` (vs bare)            | 1     | ✅ fixed | `obsidianmd/prefer-window-timers` (error) |
| 7 | README placeholder text                    | 1     | ✅ clean | manual review (README is fully written; not reproducible) |

`npm run lint` is now wired into CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml))
and runs green: **0 errors, 0 warnings**. Item #2 is done — the parser uses
Obsidian's built-in YAML engine via [yaml-engine.ts](../src/parser/yaml-engine.ts),
js-yaml is gone from shipped code (devDependency only, for the test stub), and
the `no-restricted-imports` rule is now an `error` to prevent regressions. See
[spike-obsidian-yaml-parser.md](spike-obsidian-yaml-parser.md) for the analysis.

The recommended `eslint-plugin-obsidianmd` ruleset enforces far more than the
seven items above (e.g. `no-unsupported-api`, which caught the 1.4.4 issue in
[recipe-id.ts](../src/recipe-id.ts) that triggered the 1.2.1 hotfix). Run
`npm run lint` locally before opening a PR; `npm run lint:fix` auto-fixes what it
can. Categories the linter can't see — #7 README placeholders — stay a manual
pre-submission check.

## 2026-09 plugin-health review round (against 1.4.0)

A later plugin-health scan surfaced five more findings. Unlike the 2026-06 set,
some of these are not reproduced by `npm run lint` — the scanner also inspects
the built `main.js` and `package.json`, which ESLint (scoped to `src/**`) does
not. Resolution:

| # | Finding | Fix | Proof |
|---|---------|-----|-------|
| 1 | Replace `js-yaml` | Shipped code already uses Obsidian's `parseYaml`/`stringifyYaml` (bundle has 0 js-yaml). Removed `js-yaml`/`@types/js-yaml` from `package.json`. The test stub ([test/obsidian-yaml-stub.ts](../test/obsidian-yaml-stub.ts)) now uses `yaml` (eemeli) as a devDependency — which is what Obsidian 1.13+ actually calls at runtime (disassembled from `obsidian-1.13.7.asar`; earlier belief that Obsidian used js-yaml applied to 1.12.x only). Three canon tests were rewritten to reflect eemeli's behavior: bare `YYYY-MM-DD` stays a string (was Date), `<<` merge keys don't resolve (YAML 1.1 feature), and long strings don't fold (Obsidian passes `lineWidth: 0`). | `grep -c js-yaml main.js` → `0`; `grep -c keepUndefined main.js` → `0` (eemeli not bundled either); `npm test` (92/92 green); `package.json` declares no js-yaml. Residual: eslint still pulls js-yaml transitively (dev-only, never shipped). |
| 2 | `document.createElement` vs `createEl` | No change. Our one call ([editor-extension.tsx](../src/editor-extension.tsx)) uses `ownerDocument.createElement` for a detached, popout-correct widget root — `createEl`/`createDiv` append and throw. The `prefer-create-el` rule only fires on the global `document`/`activeDocument`, so ESLint is clean; a disable directive would be unused. The bundle hits are React internals. | ESLint clean on the file; the bare-`document.createElement` hits in `main.js` are bundled React. |
| 3 | `PluginSettingTab` lacks `getSettingDefinitions()` | Added declarative `getSettingDefinitions()` (folder control) to `KaperSettingTab`; kept `display()` as the pre-1.13 fallback (not called when definitions are returned). Bumped `obsidian` devDependency to `^1.13.1` for the API types. | `npm run build` (tsc) passes against 1.13.1 types; declarative render is searchable on 1.13+. |
| 4 | Missing release attestations | Added an `actions/attest-build-provenance@v2` step and `id-token`/`attestations` permissions to [release.yml](../.github/workflows/release.yml). | After a tagged release, `gh attestation verify main.js` passes (pending next release). |
| 5 | Uses web storage | Replaced the `sessionStorage` tab-preference in [App.tsx](../src/ui/App.tsx) with an in-memory `Map` (same per-session lifetime). | `grep -rn "localStorage\|sessionStorage" src` → empty. |
