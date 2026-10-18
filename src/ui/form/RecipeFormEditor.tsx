import { AssetIO } from '../../obsidian/assets';
import { RecipeModel } from '../../recipe/parser/types';
import { BasicsSection } from './BasicsSection';
import { DetailsSection } from './DetailsSection';
import { IngredientsSection } from './IngredientsSection';
import { StepsSection } from './StepsSection';
import { TitleField } from './TitleField';
import { useRecipeDraft } from './use-recipe-draft';

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
