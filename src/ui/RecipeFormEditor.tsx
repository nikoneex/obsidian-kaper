import { useState } from 'react';
import { AssetIO } from '../assets';
import { RecipeModel } from '../parser/types';
import { RecipeDraft, draftToRecipe, recipeToDraft } from './recipe-form/draft';
import { BasicsSection } from './recipe-form/BasicsSection';
import { DetailsSection } from './recipe-form/DetailsSection';
import { IngredientsSection } from './recipe-form/IngredientsSection';
import { StepsSection } from './recipe-form/StepsSection';

interface RecipeFormEditorProps {
  recipe: RecipeModel;
  assets: AssetIO;
  filePath: string;
  onChange: (recipe: RecipeModel) => void;
}

export function RecipeFormEditor({ recipe, assets, filePath, onChange }: RecipeFormEditorProps) {
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

      <BasicsSection draft={draft} update={update} assets={assets} filePath={filePath} />
      <IngredientsSection draft={draft} update={update} />
      <StepsSection draft={draft} update={update} assets={assets} filePath={filePath} />
      <DetailsSection draft={draft} update={update} />
    </form>
  );
}
