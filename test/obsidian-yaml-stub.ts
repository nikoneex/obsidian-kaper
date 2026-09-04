// Test stand-in for the `obsidian` module (the npm package is types-only with
// no runtime). Mirrors Obsidian's real implementation, verified by
// disassembling the shipped app (obsidian-1.13.7.asar).
//
// Obsidian's YAML engine is eemeli/yaml (npm `yaml`), NOT js-yaml. In the asar,
//   parseYaml     → yL:  return wT(src, null, {})
//   stringifyYaml → bL:  new Document(obj, replacer, opts).toString(opts)
// where opts is exactly `{ nullStr: '', lineWidth: 0, aliasDuplicateObjects: false }`.
// Class-shape evidence: `class Ex { commentBefore, comment, errors, warnings }`
// (eemeli/yaml's Document); options `lineCounter`, `prettyErrors`, `keepUndefined`,
// `nullStr`, `aliasDuplicateObjects` (all eemeli-only, not present in js-yaml).
//
// This stub calls the same engine (`yaml`, devDependency) with the same
// stringify options so the characterization ("canon") suite matches what
// Obsidian actually does at runtime.
//
// Lives outside src/ so the no-restricted-imports lint rule (which targets
// src/**) does not apply — only shipped code is governed.
import { parse, stringify } from 'yaml';

const OBSIDIAN_STRINGIFY_OPTS = {
  nullStr: '',
  lineWidth: 0,
  aliasDuplicateObjects: false,
} as const;

export function parseYaml(src: string): unknown {
  return parse(src);
}

export function stringifyYaml(obj: unknown): string {
  return stringify(obj, OBSIDIAN_STRINGIFY_OPTS);
}
