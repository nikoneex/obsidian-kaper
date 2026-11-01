import { describe, expect, it } from 'vitest';
import { IngredientGroup, RecipeModel } from './parser/types';
import { isScalableServings, scaleRecipe } from './scaling';

function recipe(ingredients: IngredientGroup, servings = 2): RecipeModel {
  return {
    version: 1,
    title: 'Test',
    servings,
    ingredients,
    steps: [],
    capabilities: new Map(),
  };
}

// Mirrors the Kaper web app's scaling-engine spec so the two stay in lockstep.
describe('scaleRecipe', () => {
  it('scales a unitless ingredient that has a real amount', () => {
    // `3 egg yolks` — unit is "" but the quantity must still double 2 -> 4.
    const result = scaleRecipe(recipe({ main: [{ amount: 3, unit: '', name: 'egg yolks' }] }), 4);
    expect(result.ingredients['main'][0].amount).toBe(6);
  });

  it('scales a standard measured ingredient', () => {
    const result = scaleRecipe(
      recipe({ main: [{ amount: 200, unit: 'g', name: 'spaghetti' }] }),
      4,
    );
    expect(result.ingredients['main'][0].amount).toBe(400);
  });

  it('scales down and rounds to two decimals', () => {
    const result = scaleRecipe(recipe({ main: [{ amount: 1, unit: 'cup', name: 'rice' }] }, 3), 1);
    expect(result.ingredients['main'][0].amount).toBe(0.33);
  });

  it('leaves genuinely unscalable units untouched', () => {
    const result = scaleRecipe(
      recipe({
        season: [
          { amount: 1, unit: 'to taste', name: 'salt' },
          { amount: 1, unit: 'Pinch', name: 'nutmeg' },
        ],
      }),
      4,
    );
    expect(result.ingredients['season'][0].amount).toBe(1);
    expect(result.ingredients['season'][1].amount).toBe(1);
  });

  it('leaves amount-less / unstructured ingredients (amount 0) untouched', () => {
    const result = scaleRecipe(recipe({ main: [{ amount: 0, unit: '', name: 'salt' }] }), 4);
    expect(result.ingredients['main'][0].amount).toBe(0);
  });

  it('keeps every other ingredient field', () => {
    const result = scaleRecipe(
      recipe({
        main: [{ amount: 100, unit: 'g', name: 'guanciale', note: 'thick-cut', sub: 'pancetta' }],
      }),
      4,
    );
    expect(result.ingredients['main'][0]).toEqual({
      amount: 200,
      unit: 'g',
      name: 'guanciale',
      note: 'thick-cut',
      sub: 'pancetta',
    });
  });

  it('does not mutate the original recipe', () => {
    const original = recipe({ main: [{ amount: 3, unit: '', name: 'egg yolks' }] });
    scaleRecipe(original, 4);
    expect(original.ingredients['main'][0].amount).toBe(3);
    expect(original.servings).toBe(2);
  });

  it('passes amounts through when scaling to 0 servings', () => {
    const result = scaleRecipe(recipe({ main: [{ amount: 3, unit: '', name: 'egg yolks' }] }), 0);
    expect(result.servings).toBe(0);
    expect(result.ingredients['main'][0].amount).toBe(3);
  });

  it('passes amounts through when the recipe itself has no servings count', () => {
    const result = scaleRecipe(
      recipe({ main: [{ amount: 3, unit: '', name: 'egg yolks' }] }, 0),
      4,
    );
    expect(result.servings).toBe(4);
    expect(result.ingredients['main'][0].amount).toBe(3);
  });

  it('returns the recipe unchanged when servings already match', () => {
    const input = recipe({ main: [{ amount: 3, unit: '', name: 'egg yolks' }] });
    expect(scaleRecipe(input, 2)).toBe(input);
  });

  it('rejects negative servings', () => {
    expect(() => scaleRecipe(recipe({}), -1)).toThrow();
  });
});

describe('isScalableServings', () => {
  it('accepts a positive whole number', () => {
    expect(isScalableServings(1)).toBe(true);
    expect(isScalableServings(12)).toBe(true);
  });

  it('rejects everything the parser lets through that has no usable ratio', () => {
    expect(isScalableServings(0)).toBe(false);
    expect(isScalableServings(-1)).toBe(false);
    expect(isScalableServings(2.5)).toBe(false);
    expect(isScalableServings(NaN)).toBe(false);
    expect(isScalableServings(Infinity)).toBe(false);
  });
});
