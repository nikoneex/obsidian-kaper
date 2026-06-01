import { RecipeModel } from '../parser/types';
import { RecipePreview } from './RecipePreview';
import { RecipeFormEditor } from './RecipeFormEditor';

export interface AppProps {
  filePath: string;
  recipe: RecipeModel | null;
  parseError?: string;
  resolveImage?: (path: string) => string;
  onChange?: (recipe: RecipeModel) => void;
  onCookMode: () => void;
  mode: 'form' | 'preview';
}

export function App({ filePath, recipe, parseError, resolveImage, onChange, onCookMode, mode }: AppProps) {
  if (parseError) {
    return (
      <div className="kaper-parse-error">
        <strong>Could not parse recipe</strong>
        <p>{parseError}</p>
      </div>
    );
  }

  if (!recipe) {
    return <div className="kaper-view-empty">No recipe data.</div>;
  }

  return (
    <div className="kaper-view-content">
      <div className="kaper-tabs">
        <button className="kaper-cook-mode-button" onClick={onCookMode}>
          Cook mode
        </button>
      </div>

      {mode === 'preview' ? (
        <RecipePreview recipe={recipe} resolveImage={resolveImage} />
      ) : (
        <RecipeFormEditor recipe={recipe} onChange={(r) => onChange?.(r)} />
      )}
    </div>
  );
}
