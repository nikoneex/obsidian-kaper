import { AssetIO } from '../assets';
import { RecipeModel } from '../parser/types';
import { RecipePreview } from './RecipePreview';

interface ReadingPreviewProps {
  filePath: string;
  assets: AssetIO;
  recipe: RecipeModel | null;
  parseError?: string;
  onStartCooking?: () => void;
}

/**
 * Read-only recipe render for Reading mode. Mirrors {@link App}'s
 * parse-error / empty handling but drops the tabs, form, and Cook-mode chrome —
 * Reading mode is non-editable, so it shows the preview alone. The frontmatter
 * is rendered separately by Obsidian as Properties above this block.
 */
export function ReadingPreview({
  filePath,
  assets,
  recipe,
  parseError,
  onStartCooking,
}: ReadingPreviewProps) {
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
    <RecipePreview
      recipe={recipe}
      assets={assets}
      filePath={filePath}
      onStartCooking={onStartCooking}
    />
  );
}
