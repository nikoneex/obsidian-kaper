import { load as parseYaml, dump as dumpYaml } from 'js-yaml';
import {
  IngredientAmount,
  IngredientGroup,
  RecipeAppMeta,
  RecipeCore,
  RecipeModel,
  RecipeStep,
} from './types';

const CORE_KEYS = new Set([
  'version', 'title', 'servings', 'difficulty', 'tags',
  'time', 'equipment', 'ingredients', 'steps', 'source', 'yield', 'coverImage',
  '_app',
]);

export interface ParsedKaperBlock {
  recipe: RecipeModel | null;
  parseError?: string;
}

export function parseKaperYaml(yamlSource: string): ParsedKaperBlock {
  let raw: unknown;
  try {
    raw = parseYaml(yamlSource);
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
  const { capabilities, version, _app, ...core } = recipe;
  const capabilityData: Record<string, unknown> = {};
  capabilities.forEach((value, key) => {
    capabilityData[key] = value;
  });
  // Order: core fields → capabilities → version → optional `_app`. Mirrors
  // kaper web so files round-trip identically. `_app` is omitted entirely
  // when empty so titles/servings-only recipes don't carry dead metadata.
  const appBlock = _app && Object.keys(_app).length > 0 ? { _app } : {};
  return dumpYaml({ ...core, ...capabilityData, version, ...appBlock }, { lineWidth: 100 });
}

function validateCore(data: Record<string, unknown>): string | null {
  // Title is optional — extractCore normalises undefined/null/non-string to
  // an empty string. UI surfaces fall back to the filename or a placeholder
  // when the title is blank.
  if (data['servings'] === undefined || typeof data['servings'] !== 'number') {
    return 'Missing required field: servings (number)';
  }
  if (!data['ingredients'] || typeof data['ingredients'] !== 'object' || Array.isArray(data['ingredients'])) {
    return 'Missing required field: ingredients (object)';
  }
  if (!Array.isArray(data['steps'])) {
    return 'Missing required field: steps (array)';
  }
  if (data['difficulty'] !== undefined && !['easy', 'medium', 'hard'].includes(data['difficulty'] as string)) {
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
    equipment: Array.isArray(data['equipment']) ? (data['equipment'] as string[]) : undefined,
    ingredients: parseIngredients(data['ingredients'] as Record<string, unknown>),
    steps: parseSteps(data['steps'] as unknown[]),
    source: typeof data['source'] === 'string' ? data['source'] : undefined,
    yield: typeof data['yield'] === 'string' ? data['yield'] : undefined,
    coverImage: typeof data['coverImage'] === 'string' ? data['coverImage'] : undefined,
    _app: extractAppMeta(data['_app']),
  };
}

function extractAppMeta(value: unknown): RecipeAppMeta | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as RecipeAppMeta;
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
      ingredients: Array.isArray(item['ingredients']) ? (item['ingredients'] as string[]) : undefined,
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
    if (CORE_KEYS.has(key)) continue;
    capabilities.set(key, value);
  }
  return capabilities;
}
