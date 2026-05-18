import { useState } from 'react';
import { RecipeModel } from '../parser/types';
import { RecipeDraft, draftToRecipe, recipeToDraft } from './recipe-form/draft';
import { BasicsSection } from './recipe-form/BasicsSection';
import { DetailsSection } from './recipe-form/DetailsSection';
import { IngredientsSection } from './recipe-form/IngredientsSection';
import { StepsSection } from './recipe-form/StepsSection';

interface RecipeFormEditorProps {
  recipe: RecipeModel;
  onChange: (recipe: RecipeModel) => void;
}

export function RecipeFormEditor({ recipe, onChange }: RecipeFormEditorProps) {
  const [draft, setDraft] = useState<RecipeDraft>(() => recipeToDraft(recipe));

  const update = (next: RecipeDraft) => {
    setDraft(next);
    onChange(draftToRecipe(next, recipe));
  };

  return (
    <form className="kaper-form" onSubmit={(e) => e.preventDefault()}>
      <div className="kaper-form__title-row">
        <input
          className="kaper-form__title-input"
          type="text"
          placeholder="Recipe title…"
          value={draft.title}
          autoComplete="off"
          onChange={(e) => update({ ...draft, title: e.target.value })}
        />
      </div>

      <BasicsSection draft={draft} update={update} />
      <IngredientsSection draft={draft} update={update} />
      <StepsSection draft={draft} update={update} />
      <DetailsSection draft={draft} update={update} />
    </form>
  );
}
