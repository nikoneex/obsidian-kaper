import { parseYaml, stringifyYaml } from 'obsidian';

/**
 * The single seam for the YAML engine.
 *
 * Backed by Obsidian's built-in `parseYaml` / `stringifyYaml`. As of Obsidian
 * 1.13.x these are backed by eemeli/yaml (npm `yaml`, YAML 1.2 core schema) —
 * verified by disassembling obsidian-1.13.7.asar:
 *   parseYaml     → yL:  return wT(src, null, {})
 *   stringifyYaml → bL:  new Document(obj, replacer,
 *                          { nullStr: '', lineWidth: 0,
 *                            aliasDuplicateObjects: false }).toString(...)
 * (Note: earlier Obsidian versions — 1.12.x and below — used js-yaml 4.1.x
 * instead. If future compatibility with those becomes a concern, revisit
 * `recipe-parser.canon.test.ts` which pins the engine-visible behavior.)
 *
 * Tests resolve `obsidian` to test/obsidian-yaml-stub.ts (see vitest.config.ts),
 * which calls the `yaml` package with the same stringify options Obsidian does.
 * The npm `obsidian` package is types-only with no runtime, so the alias is
 * required.
 */

export function parseYamlSource(src: string): unknown {
  return parseYaml(src);
}

export function serializeYamlObject(obj: unknown): string {
  return stringifyYaml(obj);
}
