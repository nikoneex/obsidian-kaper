import { describe, expect, it } from 'vitest';
import { RecipeModel } from './parser/types';
import { hasIngredients, hasSteps, isRecipeEmpty, nonEmptyIngredientGroups } from './recipe-model';

function recipe(partial: Partial<RecipeModel>): RecipeModel {
  return { title: 'X', ingredients: {}, steps: [], ...partial } as unknown as RecipeModel;
}

describe('nonEmptyIngredientGroups', () => {
  it('drops groups with no items', () => {
    const groups = nonEmptyIngredientGroups({
      Main: [{ amount: 1, unit: 'cup', name: 'flour' }],
      Empty: [],
    });
    expect(groups.map(([name]) => name)).toEqual(['Main']);
  });
});

describe('hasIngredients / hasSteps', () => {
  it('reflect whether the recipe has any ingredients or steps', () => {
    const full = recipe({
      ingredients: { Main: [{ amount: 1, unit: 'cup', name: 'flour' }] },
      steps: [{ title: 'Mix' }],
    });
    expect(hasIngredients(full)).toBe(true);
    expect(hasSteps(full)).toBe(true);
  });

  it('treat a group of only-empty lists as no ingredients', () => {
    expect(hasIngredients(recipe({ ingredients: { Main: [] } }))).toBe(false);
  });
});

describe('isRecipeEmpty', () => {
  it('is true for null/undefined', () => {
    expect(isRecipeEmpty(null)).toBe(true);
    expect(isRecipeEmpty(undefined)).toBe(true);
  });

  it('is true when there are neither ingredients nor steps', () => {
    expect(isRecipeEmpty(recipe({}))).toBe(true);
  });

  it('is false when either ingredients or steps exist', () => {
    expect(isRecipeEmpty(recipe({ steps: [{ title: 'Mix' }] }))).toBe(false);
    expect(
      isRecipeEmpty(recipe({ ingredients: { Main: [{ amount: 1, unit: 'g', name: 'salt' }] } })),
    ).toBe(false);
  });
});
