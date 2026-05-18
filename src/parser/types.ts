export interface IngredientAmount {
  amount: number;
  unit: string;
  name: string;
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

/**
 * Per-installation app-managed metadata round-tripped at the bottom of the
 * kaper YAML block. The plugin doesn't author these fields; kaper web does
 * (favorites, last-cooked). Preserved verbatim so a recipe written on web
 * keeps its meta when edited in Obsidian.
 */
export interface RecipeAppMeta {
  isFavorite?: boolean;
  lastCooked?: string;
  [key: string]: unknown;
}

export interface RecipeCore {
  version: number;
  title: string;
  servings: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  time?: RecipeTime;
  equipment?: string[];
  ingredients: IngredientGroup;
  steps: RecipeStep[];
  source?: string;
  yield?: string;
  coverImage?: string;
  _app?: RecipeAppMeta;
}

export interface RecipeModel extends RecipeCore {
  capabilities: Map<string, unknown>;
}
