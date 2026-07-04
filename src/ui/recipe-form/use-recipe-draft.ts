import { useState } from 'react';
import { RecipeModel } from '../../parser/types';
import { RecipeDraft, draftToRecipe, recipeToDraft } from './draft';

/**
 * Form-draft state shared by the desktop form editor and the mobile form modal:
 * holds the editable {@link RecipeDraft} and emits the converted
 * {@link RecipeModel} to `onChange` on every update.
 */
export function useRecipeDraft(
  recipe: RecipeModel,
  onChange: (recipe: RecipeModel) => void,
): { draft: RecipeDraft; update: (next: RecipeDraft) => void } {
  const [draft, setDraft] = useState<RecipeDraft>(() => recipeToDraft(recipe));

  const update = (next: RecipeDraft) => {
    setDraft(next);
    onChange(draftToRecipe(next, recipe));
  };

  return { draft, update };
}
