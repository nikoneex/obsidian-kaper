import { IngredientAmount, IngredientGroup, RecipeModel } from './parser/types';

/**
 * Shared predicates over a {@link RecipeModel}. Centralised so "does this recipe
 * have ingredients / steps / any content" is defined once, rather than each call
 * site re-deriving it (and drifting — e.g. `reduce` in one place, `some` in
 * another).
 */

/** Ingredient groups that actually contain items, as `[name, items]` entries. */
export function nonEmptyIngredientGroups(
  ingredients: IngredientGroup,
): [string, IngredientAmount[]][] {
  return Object.entries(ingredients).filter(([, items]) => items.length > 0);
}

/** True when the recipe lists at least one ingredient. */
export function hasIngredients(recipe: RecipeModel): boolean {
  return nonEmptyIngredientGroups(recipe.ingredients).length > 0;
}

/** True when the recipe has at least one step. */
export function hasSteps(recipe: RecipeModel): boolean {
  return recipe.steps.length > 0;
}

/** True when there is no recipe, or it has neither ingredients nor steps. */
export function isRecipeEmpty(recipe: RecipeModel | null | undefined): boolean {
  return !recipe || (!hasIngredients(recipe) && !hasSteps(recipe));
}
