import { IngredientAmount, IngredientGroup, RecipeModel } from './parser/types';

/**
 * Units that cannot be scaled mathematically — left as-is.
 *
 * Note: an empty unit is NOT here. A unitless ingredient with a real amount
 * (e.g. `3 egg yolks`, `2 onions`) must still scale; only the units below are
 * genuinely unscalable. Truly amount-less ingredients are handled by the
 * `amount === 0` guard in {@link scaleAmount}.
 */
const UNSCALABLE_UNITS = new Set(['to taste', 'as needed', 'pinch', 'dash']);

/**
 * True when a recipe's servings count can seed the scaler: a positive whole
 * number. The parser only checks that `servings` is a number, so `0`, a
 * negative, a fraction, `NaN`, or `Infinity` can all reach the UI; none of
 * them gives a usable ratio (and a negative makes {@link scaleRecipe} throw),
 * so callers skip scaling entirely for those recipes.
 */
export function isScalableServings(servings: number): boolean {
  return Number.isInteger(servings) && servings > 0;
}

/**
 * Returns a copy of `recipe` with every ingredient amount scaled to
 * `targetServings`. The original is never mutated.
 *
 * This is a line-for-line port of the Kaper web app's `ScalingEngineService`,
 * so a recipe scales identically in Obsidian and at kaper.me: amounts round to
 * two decimals, unscalable units pass through, and scaling to or from zero
 * servings only updates the count (there is no per-serving amount to multiply).
 */
export function scaleRecipe(recipe: RecipeModel, targetServings: number): RecipeModel {
  if (targetServings < 0) {
    throw new Error('targetServings must be >= 0');
  }

  // Skip scaling when either side is 0 — there's no meaningful per-serving
  // amount to multiply by. Caller still gets the new servings count, and
  // ingredient amounts pass through unchanged (better than NaN/0 of every
  // ingredient, which both render badly).
  if (targetServings === 0 || recipe.servings <= 0) {
    return { ...recipe, servings: targetServings };
  }
  if (targetServings === recipe.servings) return recipe;

  const ratio = targetServings / recipe.servings;
  return {
    ...recipe,
    servings: targetServings,
    ingredients: scaleIngredients(recipe.ingredients, ratio),
  };
}

function scaleIngredients(groups: IngredientGroup, ratio: number): IngredientGroup {
  const scaled: IngredientGroup = {};
  for (const [group, items] of Object.entries(groups)) {
    scaled[group] = items.map((item) => scaleAmount(item, ratio));
  }
  return scaled;
}

function scaleAmount(item: IngredientAmount, ratio: number): IngredientAmount {
  // No quantity to scale (unstructured ingredients parse to amount 0), or a
  // unit that has no meaningful multiple — pass through untouched.
  if (item.amount === 0 || UNSCALABLE_UNITS.has(item.unit.toLowerCase().trim())) {
    return item;
  }
  return { ...item, amount: round(item.amount * ratio) };
}

/** Rounds to at most 2 decimal places. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
