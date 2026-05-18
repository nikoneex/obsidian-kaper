import { useState } from 'react';
import { RecipeModel } from '../parser/types';
import { RecipePreview } from './RecipePreview';
import { RecipeFormEditor } from './RecipeFormEditor';

type Tab = 'preview' | 'form';

const TAB_PREFIX = 'kaper:tab:';

function readTabPreference(filePath: string): Tab | null {
  if (!filePath) return null;
  const value = sessionStorage.getItem(TAB_PREFIX + filePath);
  return value === 'preview' || value === 'form' ? value : null;
}

function writeTabPreference(filePath: string, tab: Tab): void {
  if (!filePath) return;
  sessionStorage.setItem(TAB_PREFIX + filePath, tab);
}

interface AppProps {
  filePath: string;
  recipe: RecipeModel | null;
  parseError?: string;
  onChange: (recipe: RecipeModel) => void;
  onCookMode: () => void;
}

export function App({ filePath, recipe, parseError, onChange, onCookMode }: AppProps) {
  const defaultTab: Tab = isEmptyRecipe(recipe) ? 'form' : 'preview';
  const [tab, setTabLocal] = useState<Tab>(
    () => readTabPreference(filePath) ?? defaultTab,
  );

  const setTab = (t: Tab) => {
    writeTabPreference(filePath, t);
    setTabLocal(t);
  };

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
        <button
          className={`kaper-tab ${tab === 'preview' ? 'is-active' : ''}`}
          onClick={() => setTab('preview')}
        >
          Preview
        </button>
        <button
          className={`kaper-tab ${tab === 'form' ? 'is-active' : ''}`}
          onClick={() => setTab('form')}
        >
          Form
        </button>
        <button className="kaper-cook-mode-button" onClick={onCookMode}>
          Cook mode
        </button>
      </div>

      {tab === 'preview' ? (
        <RecipePreview recipe={recipe} onSwitchToForm={() => setTab('form')} />
      ) : (
        <RecipeFormEditor recipe={recipe} onChange={onChange} />
      )}
    </div>
  );
}

function isEmptyRecipe(recipe: RecipeModel | null | undefined): boolean {
  if (!recipe) return true;
  const ingredientCount = Object.values(recipe.ingredients).reduce(
    (sum, list) => sum + list.length,
    0,
  );
  return ingredientCount === 0 && recipe.steps.length === 0;
}
