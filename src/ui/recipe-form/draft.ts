import { IngredientAmount, RecipeModel, RecipeStep } from '../../parser/types';

// ── Draft types (form-local shape, distinct from RecipeModel) ────────────────

export interface IngredientDraft extends IngredientAmount {
  _id: string;
}

export interface IngredientGroupDraft {
  groupName: string;
  ingredients: IngredientDraft[];
}

export interface RecipeDraft {
  title: string;
  servings: number;
  difficulty: '' | 'easy' | 'medium' | 'hard';
  tags: string[];
  coverImage: string;
  timePrep: string;
  timeCook: string;
  source: string;
  ingredientGroups: IngredientGroupDraft[];
  steps: RecipeStep[];
}

// Shared contract used by every section component in `recipe-form/`.
export interface SectionProps {
  draft: RecipeDraft;
  update: (next: RecipeDraft) => void;
}

// ── Stable ingredient IDs (session-scoped counter for React keys) ────────────

let nextIngredientId = 0;
export function newIngredientId(): string {
  return `ing-${++nextIngredientId}`;
}

export function emptyIngredient(): IngredientDraft {
  return { _id: newIngredientId(), amount: 0, unit: '', name: '' };
}

// ── Conversion ──────────────────────────────────────────────────────────────

export function recipeToDraft(recipe: RecipeModel): RecipeDraft {
  const groupEntries = Object.entries(recipe.ingredients);
  const ingredientGroups: IngredientGroupDraft[] =
    groupEntries.length === 0
      ? [{ groupName: 'main', ingredients: [emptyIngredient()] }]
      : groupEntries.map(([groupName, ingredients]) => ({
          groupName,
          ingredients: ingredients.map((i) => ({ ...i, _id: newIngredientId() })),
        }));

  return {
    title: recipe.title,
    servings: recipe.servings,
    difficulty: recipe.difficulty ?? '',
    tags: recipe.tags ?? [],
    coverImage: recipe.coverImage ?? '',
    timePrep: recipe.time?.prep ?? '',
    timeCook: recipe.time?.cook ?? '',
    source: recipe.source ?? '',
    ingredientGroups,
    steps: recipe.steps.map((s) => ({ ...s })),
  };
}

export function draftToRecipe(draft: RecipeDraft, original: RecipeModel): RecipeModel {
  const ingredients: Record<string, IngredientAmount[]> = {};
  for (const group of draft.ingredientGroups) {
    if (!group.groupName.trim()) continue;
    ingredients[group.groupName] = group.ingredients
      .filter((i) => i.name.trim())
      .map((i) =>
        compact({
          amount: i.amount,
          unit: i.unit,
          name: i.name,
          note: i.note,
          sub: i.sub,
          optional: i.optional,
        }),
      ) as IngredientAmount[];
  }

  const tags = draft.tags.map((t) => t.trim()).filter(Boolean);

  const time = compact({ prep: draft.timePrep, cook: draft.timeCook });

  const steps = draft.steps
    .filter((s) => s.title.trim())
    .map((s) =>
      compact({
        title: s.title,
        ingredients: s.ingredients,
        duration: s.duration,
        note: s.note,
        tip: s.tip,
        warning: s.warning,
        technique: s.technique,
        image: s.image,
      }),
    ) as RecipeModel['steps'];

  return {
    ...original,
    version: 1,
    title: draft.title,
    servings: draft.servings,
    difficulty: draft.difficulty || undefined,
    tags: tags.length ? tags : undefined,
    coverImage: draft.coverImage || undefined,
    time: Object.keys(time).length ? time : undefined,
    source: draft.source || undefined,
    ingredients,
    steps,
    capabilities: original.capabilities,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function compact<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === '' || v === false) continue;
    (result as Record<string, unknown>)[k] = v;
  }
  return result;
}
