import { AssetIO } from '../assets';
import { RecipeModel } from '../parser/types';
import { BasicsSection } from './recipe-form/BasicsSection';
import { DetailsSection } from './recipe-form/DetailsSection';
import { IngredientsSection } from './recipe-form/IngredientsSection';
import { StepsSection } from './recipe-form/StepsSection';
import { TitleField } from './recipe-form/TitleField';
import { useRecipeDraft } from './recipe-form/use-recipe-draft';

interface RecipeFormEditorProps {
  recipe: RecipeModel;
  assets: AssetIO;
  filePath: string;
  onChange: (recipe: RecipeModel) => void;
}

export function RecipeFormEditor({ recipe, assets, filePath, onChange }: RecipeFormEditorProps) {
  const { draft, update } = useRecipeDraft(recipe, onChange);

  return (
    <form className="kaper-form" onSubmit={(e) => e.preventDefault()}>
      <TitleField draft={draft} update={update} />
      <BasicsSection draft={draft} update={update} assets={assets} filePath={filePath} />
      <IngredientsSection draft={draft} update={update} />
      <StepsSection draft={draft} update={update} assets={assets} filePath={filePath} />
      <DetailsSection draft={draft} update={update} />
    </form>
  );
}
