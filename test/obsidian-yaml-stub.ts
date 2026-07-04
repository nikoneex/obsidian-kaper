// Test stand-in for the `obsidian` module (the npm package is types-only with
// no runtime). Mirrors Obsidian's real implementation, verified against the
// bundled app (obsidian-1.12.7): parseYaml = js-yaml load with the default
// schema; stringifyYaml = js-yaml dump with default options (lineWidth 80).
//
// Lives outside src/ so the no-restricted-imports lint rule (which targets
// src/**) doesn't flag this js-yaml import — only shipped code is governed.
import { load, dump } from 'js-yaml';

export function parseYaml(src: string): unknown {
  return load(src);
}

export function stringifyYaml(obj: unknown): string {
  return dump(obj);
}

// Minimal runtime stand-in so modules that `instanceof TFile` (e.g.
// src/recipe-file.ts) can be imported by unit tests that only exercise their
// pure functions. Not a functional TFile.
export class TFile {}
