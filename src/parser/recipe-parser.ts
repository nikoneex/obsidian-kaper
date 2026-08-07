import { parseYamlSource, serializeYamlObject } from './yaml-engine';
import { IngredientAmount, IngredientGroup, RecipeCore, RecipeModel, RecipeStep } from './types';

const CORE_KEYS = new Set([
  'version',
  'title',
  'servings',
  'difficulty',
  'tags',
  'time',
  'ingredients',
  'steps',
  'source',
  'yield',
  'coverImage',
]);

// Keys from an earlier schema that are no longer part of the format. Recognised
// so they're neither treated as forward-compatible capability blocks nor
// round-tripped — a recipe still carrying them sheds them on its next save.
// Mirrors the Kaper web app: `_app` metadata (favourites, last-cooked) now lives
// in the vault's meta.json, and `equipment` is parked until rendered again.
const DROPPED_KEYS = new Set(['_app', 'equipment']);

export interface ParsedKaperBlock {
  recipe: RecipeModel | null;
  parseError?: string;
}

export function parseKaperYaml(yamlSource: string): ParsedKaperBlock {
  let raw: unknown;
  try {
    raw = parseYamlSource(yamlSource);
  } catch (e) {
    return { recipe: null, parseError: `YAML parse error: ${(e as Error).message}` };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { recipe: null, parseError: 'kaper block must be a YAML object' };
  }

  const data = raw as Record<string, unknown>;

  const coreError = validateCore(data);
  if (coreError) {
    return { recipe: null, parseError: coreError };
  }

  const core = extractCore(data);
  const capabilities = parseCapabilities(data);

  return { recipe: { ...core, capabilities } };
}

export function serializeKaperYaml(recipe: RecipeModel): string {
  const { capabilities, version, ...core } = recipe;
  const capabilityData: Record<string, unknown> = {};
  capabilities.forEach((value, key) => {
    capabilityData[key] = value;
  });
  // Order: core fields → capabilities → version. Mirrors the Kaper web app so
  // files round-trip identically. Dropped keys (`_app`, `equipment`) are never
  // in the model, so they fall out of the file here.
  return serializeYamlObject({ ...core, ...capabilityData, version });
}

function validateCore(data: Record<string, unknown>): string | null {
  // Title is optional — extractCore normalises undefined/null/non-string to
  // an empty string. UI surfaces fall back to the filename or a placeholder
  // when the title is blank.
  //
  // Steps are optional too, matching the Kaper web app — extractCore treats a
  // missing/malformed `steps` the same as an empty array, rather than erroring.
  if (data['servings'] === undefined || typeof data['servings'] !== 'number') {
    return 'Missing required field: servings (number)';
  }
  if (
    !data['ingredients'] ||
    typeof data['ingredients'] !== 'object' ||
    Array.isArray(data['ingredients'])
  ) {
    return 'Missing required field: ingredients (object)';
  }
  if (
    data['difficulty'] !== undefined &&
    !['easy', 'medium', 'hard'].includes(data['difficulty'] as string)
  ) {
    return 'difficulty must be one of: easy, medium, hard';
  }
  return null;
}

function extractCore(data: Record<string, unknown>): RecipeCore {
  return {
    version: typeof data['version'] === 'number' ? data['version'] : 1,
    title: typeof data['title'] === 'string' ? data['title'] : '',
    servings: data['servings'] as number,
    difficulty: data['difficulty'] as RecipeCore['difficulty'],
    tags: Array.isArray(data['tags']) ? (data['tags'] as string[]) : undefined,
    time: data['time'] as RecipeCore['time'],
    ingredients: parseIngredients(data['ingredients'] as Record<string, unknown>),
    steps: Array.isArray(data['steps']) ? parseSteps(data['steps']) : [],
    source: typeof data['source'] === 'string' ? data['source'] : undefined,
    yield: typeof data['yield'] === 'string' ? data['yield'] : undefined,
    coverImage: typeof data['coverImage'] === 'string' ? data['coverImage'] : undefined,
  };
}

function parseIngredients(raw: Record<string, unknown>): IngredientGroup {
  const groups: IngredientGroup = {};
  for (const [group, items] of Object.entries(raw)) {
    if (!Array.isArray(items)) continue;
    groups[group] = items.map((item) => parseIngredientAmount(item));
  }
  return groups;
}

function parseIngredientAmount(raw: unknown): IngredientAmount {
  if (typeof raw !== 'object' || raw === null) {
    return { amount: 0, unit: '', name: String(raw) };
  }
  const item = raw as Record<string, unknown>;
  return {
    amount: typeof item['amount'] === 'number' ? item['amount'] : 0,
    unit: typeof item['unit'] === 'string' ? item['unit'] : '',
    name: typeof item['name'] === 'string' ? item['name'] : '',
    sub: typeof item['sub'] === 'string' ? item['sub'] : undefined,
    optional: typeof item['optional'] === 'boolean' ? item['optional'] : undefined,
  };
}

function parseSteps(raw: unknown[]): RecipeStep[] {
  return raw.map((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return { title: String(entry) };
    }
    const item = entry as Record<string, unknown>;
    return {
      title: typeof item['title'] === 'string' ? item['title'] : '',
      ingredients: Array.isArray(item['ingredients'])
        ? (item['ingredients'] as string[])
        : undefined,
      duration: typeof item['duration'] === 'string' ? item['duration'] : undefined,
      tip: typeof item['tip'] === 'string' ? item['tip'] : undefined,
      warning: typeof item['warning'] === 'string' ? item['warning'] : undefined,
      technique: typeof item['technique'] === 'string' ? item['technique'] : undefined,
      note: typeof item['note'] === 'string' ? item['note'] : undefined,
      image: typeof item['image'] === 'string' ? item['image'] : undefined,
    };
  });
}

function parseCapabilities(data: Record<string, unknown>): Map<string, unknown> {
  const capabilities = new Map<string, unknown>();
  for (const [key, value] of Object.entries(data)) {
    if (CORE_KEYS.has(key) || DROPPED_KEYS.has(key)) continue;
    capabilities.set(key, value);
  }
  return capabilities;
}
