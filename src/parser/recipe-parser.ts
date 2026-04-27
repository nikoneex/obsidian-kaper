import { load as parseYaml, dump as dumpYaml } from 'js-yaml';
import {
  IngredientAmount,
  IngredientGroup,
  RecipeCore,
  RecipeModel,
  RecipeStep,
} from './types';

const CORE_KEYS = new Set([
  'version', 'title', 'servings', 'difficulty', 'tags',
  'time', 'equipment', 'ingredients', 'steps', 'source', 'yield', 'coverImage',
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
  const { capabilities, version, ...rest } = recipe;
  const capabilityData: Record<string, unknown> = {};
  capabilities.forEach((value, key) => {
    capabilityData[key] = value;
  });
  return dumpYaml({ ...rest, ...capabilityData, version }, { lineWidth: 100 });
}

function validateCore(data: Record<string, unknown>): string | null {
  if (!data['title'] || typeof data['title'] !== 'string') {
    return 'Missing required field: title (string)';
  }
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
    title: data['title'] as string,
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
