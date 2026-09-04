import { Platform } from 'obsidian';
import { useState } from 'react';
import { AssetIO } from '../assets';
import { RecipeModel } from '../parser/types';
import { isRecipeEmpty } from '../recipe-model';
import { RecipePreview } from './RecipePreview';
import { RecipeFormEditor } from './RecipeFormEditor';

type Tab = 'preview' | 'form';

// Per-session tab preference, keyed by file path. Held in memory rather than
// browser web storage (which Obsidian discourages for plugin state). The
// lifetime matches the previous behavior: it survives widget remounts within
// the session and clears on reload.
const tabPreferences = new Map<string, Tab>();

function readTabPreference(filePath: string): Tab | null {
  if (!filePath) return null;
  return tabPreferences.get(filePath) ?? null;
}

function writeTabPreference(filePath: string, tab: Tab): void {
  if (!filePath) return;
  tabPreferences.set(filePath, tab);
}

interface AppProps {
  filePath: string;
  assets: AssetIO;
  recipe: RecipeModel | null;
  parseError?: string;
  onChange: (recipe: RecipeModel) => void;
  onCookMode: () => void;
}

export function App({ filePath, assets, recipe, parseError, onChange, onCookMode }: AppProps) {
  const defaultTab: Tab = isRecipeEmpty(recipe) ? 'form' : 'preview';
  const [tab, setTabLocal] = useState<Tab>(() => readTabPreference(filePath) ?? defaultTab);

  const setTab = (t: Tab) => {
    writeTabPreference(filePath, t);
    setTabLocal(t);
  };

  // Mobile is preview-only for now: the form isn't built for small screens yet,
  // and Cook mode's mobile site isn't available.
  const mobile = Platform.isMobile;

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
      {!mobile && (
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
            Start Cooking
          </button>
        </div>
      )}

      {!mobile && tab === 'form' ? (
        <RecipeFormEditor recipe={recipe} assets={assets} filePath={filePath} onChange={onChange} />
      ) : (
        <RecipePreview
          recipe={recipe}
          assets={assets}
          filePath={filePath}
          onSwitchToForm={mobile ? undefined : () => setTab('form')}
        />
      )}
    </div>
  );
}
