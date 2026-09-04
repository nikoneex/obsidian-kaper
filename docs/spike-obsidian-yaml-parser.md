# Spike: swapping the recipe parser to Obsidian's YAML engine

> **SUPERSEDED (2026-09-03).** The parity claim below was true against
> **obsidian-1.12.7** but is no longer true: Obsidian **1.13.x** switched its
> built-in YAML engine from js-yaml 4.1.x to **eemeli/yaml (npm `yaml`,
> YAML 1.2 core schema)**. Both engines are bundled inside the modern asar, but
> the exported `parseYaml`/`stringifyYaml` now call eemeli. See the
> "2026-09 plugin-health review round" section of
> [obsidian-review-warnings.md](obsidian-review-warnings.md) for the current
> engine story and the canon-suite behaviors that changed as a result.

**Branch:** `worktree-spike+obsidian-yaml-parser` · **Date:** 2026-06-07
**Goal:** De-risk migrating `src/parser/recipe-parser.ts` off the bundled
`js-yaml` package (flagged by the Obsidian review bot, item #2 in
`obsidian-review-warnings.md`) onto Obsidian's built-in `parseYaml` /
`stringifyYaml`. Strategy per request: **pin the current behavior as canon,
guard against regression, then swap.**

## TL;DR

The swap is **low risk**.

- **Parsing is byte-for-byte identical.** Obsidian bundles **js-yaml 4.1.0**;
  this project uses **js-yaml 4.1.1** — same 4.1.x schema and resolvers.
  Obsidian's `parseYaml(src)` is literally `load(src, null, {})` (default
  `DEFAULT_SCHEMA`), the same call we make today.
- **The only behavioral difference is serialization line width.** Obsidian's
  `stringifyYaml(obj)` exposes **no options** and falls back to js-yaml's
  default `lineWidth: 80`. We currently pass `lineWidth: 100`. Long single-line
  fields (>80 chars) will therefore fold differently after the swap. This is
  cosmetic — output stays valid YAML and round-trips to an identical model.

## How this was verified

1. **Inspected the real Obsidian bundle** (`~/Library/Application Support/obsidian/obsidian-1.12.7.asar`):
   - License banner: `(*! js-yaml 4.1.0 ... *)` — single YAML lib, one version.
   - `parseYaml` wrapper: `function mA(e){return xx(e,null,{})}` where `xx` is
     js-yaml `load` → default schema, no options.
   - Dumper constructor: `this.lineWidth = t.lineWidth || 80` → default 80.
2. **Probed js-yaml 4.1.1 coercion** directly to record the engine-sensitive
   behaviors (below).
3. **Added a characterization ("canon") suite** that pins those behaviors and
   the exact serialized output, then refactored the engine behind a seam and
   re-ran — 64/64 green, proving the refactor is behavior-neutral.

## Engine-sensitive behaviors now locked as canon

`src/parser/recipe-parser.canon.test.ts` (27 tests) pins the surfaces most
likely to shift if the engine ever changes — these are the regression tripwires:

| Behavior (js-yaml 4.1.x) | Canon | Note |
|---|---|---|
| `yes` / `no` / `on` / `off` | **strings** (only `true`/`false` are booleans) | YAML 1.1 engines would coerce to booleans |
| bare date `2021-01-01` | parsed to a **Date** → lost from string fields (`source` becomes `undefined`) | quote it to keep it a string |
| `0x10` / `017` / `2.5` | hex 16 / decimal 17 / 2.5 | numeric coercion |
| quoted `"5"` in a number field | string → falls back to `0` | |
| empty / `~` / `null` | `null` → normalized to `''` for string fields | |
| duplicate keys, tab indentation | **throw** → `parseError` | |
| anchors/aliases (`&`/`*`), merge keys (`<<`) | **resolved** | |
| flow style (`[a, b]`, `{k: v}`) | parses like block style | |
| `dump()` of ambiguous strings (`yes`, `123`, `2021-01-01`) | **quoted** so they round-trip as strings | the safety net for the date/bool quirks |
| exact serialized output | inline snapshot: key order (core → capabilities → `version`), 2-space indent, `lineWidth: 100` | the serialize tripwire |

## Seam introduced

`src/parser/yaml-engine.ts` now centralizes the only two YAML calls
(`parseYamlSource`, `serializeYamlObject`); `recipe-parser.ts` imports from it.
The js-yaml import lives in this one file, so the swap is a **single-file edit**.

## The swap, when we pull the trigger

1. In `src/parser/yaml-engine.ts`, replace the two bodies:
   ```ts
   import { parseYaml, stringifyYaml } from 'obsidian';
   export const parseYamlSource = (src: string): unknown => parseYaml(src);
   export const serializeYamlObject = (obj: unknown): string => stringifyYaml(obj);
   ```
2. Add a vitest mock for the `obsidian` module (it has no Node runtime). A
   faithful mock delegates to js-yaml: `parseYaml = (s) => load(s)`,
   `stringifyYaml = (o) => dump(o)` (note: **no** `lineWidth` — match Obsidian's
   default 80). Wire it via a `vitest.config.ts` alias or `__mocks__/obsidian.ts`.
3. Run the canon suite. Expected result:
   - **All parse tests stay green** (same engine).
   - **The long-line serialize test fails** (`lineWidth` 100 → 80). Decide:
     accept 80-col wrapping (recommended — cosmetic) and update that one
     snapshot, or keep js-yaml purely for serialization (not recommended; keeps
     the flagged dependency).
4. Remove `js-yaml` + `@types/js-yaml` from `package.json`; flip the
   `no-restricted-imports` lint rule from `warn` to `error`.
5. Update `docs/obsidian-review-warnings.md` item #2 → fixed.

## Residual risks

- **Serialization wrapping** changes for long fields (80 vs 100). Cosmetic;
  the canon snapshot makes it explicit.
- **Future Obsidian YAML version bump.** If Obsidian ever moves off js-yaml
  4.1.x, coercion could shift (esp. `yes/no/on/off`, dates). The canon suite is
  the guardrail that would catch it — but note the suite runs against our mock,
  not the live Obsidian runtime, so it validates *our assumption of parity*, not
  Obsidian itself. Re-verify the bundle on major Obsidian upgrades.
- **No behavior change ships in this spike.** The branch only adds tests + the
  engine seam; `parseYamlSource`/`serializeYamlObject` still use js-yaml at
  `lineWidth: 100`.

## Recommendation

Proceed with the swap as its own small PR. Land this spike's **canon suite and
`yaml-engine` seam first** (they're behavior-neutral and independently
valuable), then do the one-file engine swap + obsidian mock behind that
guardrail.
