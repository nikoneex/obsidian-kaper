import { describe, it, expect } from 'vitest';
import { parseKaperYaml, serializeKaperYaml } from './recipe-parser';
import { RecipeModel } from './types';

const FULL_YAML = `version: 1
title: Pasta
servings: 4
difficulty: medium
time:
  prep: 10m
  cook: 20m
tags:
  - italian
  - pasta
ingredients:
  pasta:
    - amount: 200
      unit: g
      name: spaghetti
  sauce:
    - amount: 100
      unit: g
      name: guanciale
      sub: pancetta
    - amount: 25
      unit: g
      name: parmesan
      optional: true
steps:
  - title: Boil water
    duration: 5m
    note: salt heavily
  - title: Cook pasta
    tip: stir often
    warning: don't overcook
    technique: gradual heat
    image: photo.jpg
    ingredients:
      - spaghetti
`;

function makeRecipe(overrides: Partial<RecipeModel> = {}): RecipeModel {
  return {
    version: 1,
    title: 'Test',
    servings: 2,
    ingredients: { main: [] },
    steps: [],
    capabilities: new Map(),
    ...overrides,
  };
}

describe('parseKaperYaml', () => {
  it('parses a minimal valid YAML block', () => {
    const result = parseKaperYaml(
      'version: 1\ntitle: Test Recipe\nservings: 2\ningredients:\n  main:\n    - amount: 100\n      unit: g\n      name: flour\nsteps:\n  - title: Mix everything',
    );
    expect(result.parseError).toBeUndefined();
    expect(result.recipe?.title).toBe('Test Recipe');
    expect(result.recipe?.servings).toBe(2);
    expect(result.recipe?.ingredients.main[0].name).toBe('flour');
    expect(result.recipe?.steps[0].title).toBe('Mix everything');
  });

  it('returns error on malformed YAML', () => {
    const result = parseKaperYaml('title: ok\n  bad: indent\n\tmixed:');
    expect(result.recipe).toBeNull();
    expect(result.parseError).toMatch(/YAML parse error/);
  });

  it('returns parseError when YAML is not an object', () => {
    const result = parseKaperYaml('- just a list');
    expect(result.recipe).toBeNull();
    expect(result.parseError).toBe('kaper block must be a YAML object');
  });

  it('normalizes missing title to empty string instead of erroring', () => {
    const result = parseKaperYaml('version: 1\nservings: 2\ningredients:\n  main: []\nsteps: []');
    expect(result.parseError).toBeUndefined();
    expect(result.recipe?.title).toBe('');
  });

  it('returns error when servings is missing', () => {
    const result = parseKaperYaml('version: 1\ntitle: x\ningredients:\n  main: []\nsteps: []');
    expect(result.parseError).toBe('Missing required field: servings (number)');
  });

  it('returns error when ingredients are missing', () => {
    const result = parseKaperYaml('version: 1\ntitle: x\nservings: 2\nsteps: []');
    expect(result.parseError).toBe('Missing required field: ingredients (object)');
  });

  it('returns error when steps are not an array', () => {
    const result = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main: []\nsteps: oops',
    );
    expect(result.parseError).toBe('Missing required field: steps (array)');
  });

  it('returns error when difficulty is invalid', () => {
    const result = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ndifficulty: extreme\ningredients:\n  main: []\nsteps: []',
    );
    expect(result.parseError).toBe('difficulty must be one of: easy, medium, hard');
  });

  it('parses multiple ingredient groups in YAML order', () => {
    const result = parseKaperYaml(FULL_YAML);
    expect(Object.keys(result.recipe!.ingredients)).toEqual(['pasta', 'sauce']);
    expect(result.recipe!.ingredients.sauce).toHaveLength(2);
  });

  it('parses optional and substitution flags on ingredients', () => {
    const result = parseKaperYaml(FULL_YAML);
    const sauce = result.recipe!.ingredients.sauce;
    expect(sauce[0].sub).toBe('pancetta');
    expect(sauce[0].optional).toBeUndefined();
    expect(sauce[1].optional).toBe(true);
  });

  it('parses all step callout types (note, tip, warning, technique, image, duration, ingredients)', () => {
    const result = parseKaperYaml(FULL_YAML);
    const [step1, step2] = result.recipe!.steps;
    expect(step1.duration).toBe('5m');
    expect(step1.note).toBe('salt heavily');
    expect(step2.tip).toBe('stir often');
    expect(step2.warning).toBe("don't overcook");
    expect(step2.technique).toBe('gradual heat');
    expect(step2.image).toBe('photo.jpg');
    expect(step2.ingredients).toEqual(['spaghetti']);
  });

  it('handles a non-object step element gracefully (no crash)', () => {
    const result = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main: []\nsteps:\n  - just a string\n  - title: real step',
    );
    expect(result.parseError).toBeUndefined();
    expect(result.recipe?.steps[0].title).toBe('just a string');
    expect(result.recipe?.steps[1].title).toBe('real step');
  });

  it('preserves unknown capability blocks forward-compatibly', () => {
    const result = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main: []\nsteps: []\nnutrition:\n  calories: 500\n  protein: 20g',
    );
    expect(result.recipe!.capabilities.get('nutrition')).toEqual({
      calories: 500,
      protein: '20g',
    });
  });

  it('parses _app metadata as a core field, not a capability', () => {
    const result = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main: []\nsteps: []\n_app:\n  isFavorite: true\n  lastCooked: "2026-04-01T12:00:00Z"',
    );
    expect(result.recipe!._app).toEqual({
      isFavorite: true,
      lastCooked: '2026-04-01T12:00:00Z',
    });
    expect(result.recipe!.capabilities.has('_app')).toBe(false);
  });

  it('preserves unknown _app keys forward-compatibly', () => {
    const result = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main: []\nsteps: []\n_app:\n  isFavorite: true\n  futureField: "abc"',
    );
    expect(result.recipe!._app?.['futureField']).toBe('abc');
  });
});

describe('serializeKaperYaml', () => {
  it('serializes recipe to YAML without code fences', () => {
    const result = serializeKaperYaml(makeRecipe({ title: 'Test' }));
    expect(result).not.toContain('```');
    expect(result).toContain('title: Test');
  });

  it('writes capability blocks alongside core fields', () => {
    const recipe = makeRecipe({
      capabilities: new Map([['nutrition', { calories: 500 }]]),
    });
    const result = serializeKaperYaml(recipe);
    expect(result).toContain('nutrition:');
    expect(result).toContain('calories: 500');
  });

  it('emits _app at the end when present', () => {
    const recipe = makeRecipe({ _app: { isFavorite: true } });
    const result = serializeKaperYaml(recipe);
    expect(result).toContain('_app:');
    expect(result).toContain('isFavorite: true');
    // _app should follow `version:` in serialized order.
    expect(result.indexOf('_app:')).toBeGreaterThan(result.indexOf('version:'));
  });

  it('omits _app entirely when it has no keys', () => {
    const recipe = makeRecipe({ _app: {} });
    const result = serializeKaperYaml(recipe);
    expect(result).not.toContain('_app');
  });
});

describe('round-trip', () => {
  it('parse → serialize → parse produces an identical model', () => {
    const first = parseKaperYaml(FULL_YAML);
    expect(first.recipe).not.toBeNull();
    const serialized = serializeKaperYaml(first.recipe!);
    const second = parseKaperYaml(serialized);
    expect(second.recipe).toEqual(first.recipe);
  });
});
