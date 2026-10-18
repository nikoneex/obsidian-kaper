export interface IngredientAmount {
  amount: number;
  unit: string;
  name: string;
  /** Prep or state detail shown after the name, e.g. "finely chopped". */
  note?: string;
  /** Substitution hint, rendered with a leading "or". */
  sub?: string;
  optional?: boolean;
}

export type IngredientGroup = Record<string, IngredientAmount[]>;

export interface RecipeStep {
  title: string;
  ingredients?: string[];
  duration?: string;
  tip?: string;
  warning?: string;
  technique?: string;
  note?: string;
  image?: string;
}

export interface RecipeTime {
  prep?: string;
  cook?: string;
  total?: string;
}

export interface RecipeCore {
  version: number;
  title: string;
  servings: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  time?: RecipeTime;
  ingredients: IngredientGroup;
  steps: RecipeStep[];
  source?: string;
  yield?: string;
  coverImage?: string;
}

export interface RecipeModel extends RecipeCore {
  capabilities: Map<string, unknown>;
}
