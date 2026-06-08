import { parseYaml, stringifyYaml } from 'obsidian';

/**
 * The single seam for the YAML engine.
 *
 * SWAPPED (spike): now backed by Obsidian's built-in `parseYaml` /
 * `stringifyYaml` instead of a bundled `js-yaml`. Verified against the bundled
 * app (obsidian-1.12.7): these are js-yaml 4.1.0 under the hood, with
 * `parseYaml(src) = load(src, null, {})` (default DEFAULT_SCHEMA), so parsing
 * matches the previous js-yaml 4.1.1 behavior exactly.
 *
 * Note: `stringifyYaml(obj)` takes no options and uses js-yaml's default
 * `lineWidth: 80` (we previously pinned 100), so long single-line fields wrap
 * sooner. This is cosmetic — output stays valid YAML and round-trips.
 *
 * Tests resolve `obsidian` to test/obsidian-yaml-stub.ts (see vitest.config.ts),
 * a faithful js-yaml-backed stand-in, since the npm `obsidian` package is
 * types-only with no runtime.
 */

export function parseYamlSource(src: string): unknown {
  return parseYaml(src);
}

export function serializeYamlObject(obj: unknown): string {
  return stringifyYaml(obj);
}
