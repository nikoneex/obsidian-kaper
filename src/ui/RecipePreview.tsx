import { AssetIO } from '../assets';
import { KAPER_WEB_URL } from '../constants';
import { RecipeModel } from '../parser/types';
import { isRecipeEmpty } from '../recipe-model';
import { IconExternalLink, IconPlay, IconTimer, IconUsers } from './icons';
import { IngredientSection } from './IngredientSection';
import { PreviewImage } from './PreviewImage';
import { StepList } from './StepList';

interface RecipePreviewProps {
  recipe: RecipeModel;
  assets: AssetIO;
  filePath: string;
  onSwitchToForm?: () => void;
  /** When set, shows a "Start Cooking" action in the header (Reading mode). */
  onStartCooking?: () => void;
}

export function RecipePreview({
  recipe,
  assets,
  filePath,
  onSwitchToForm,
  onStartCooking,
}: RecipePreviewProps) {
  const isEmpty = isRecipeEmpty(recipe);
  const showServings = recipe.servings > 0;
  const times = [
    recipe.time?.prep ? `Prep ${recipe.time.prep}` : null,
    recipe.time?.cook ? `Cook ${recipe.time.cook}` : null,
  ].filter(Boolean);
  const hasTime = times.length > 0;
  const showDifficulty = !!recipe.difficulty;

  return (
    <article className="kaper-preview">
      {recipe.coverImage && (
        <PreviewImage
          className="kaper-preview__cover"
          src={assets.resolveImage(recipe.coverImage, filePath)}
        />
      )}
      <header className="kaper-preview__header">
        <div className="kaper-preview__title-row">
          <h1 className="kaper-preview__title">{recipe.title}</h1>
          {onStartCooking && (
            <button type="button" className="kaper-preview__cook-btn" onClick={onStartCooking}>
              <IconPlay />
              Start Cooking
            </button>
          )}
        </div>

        <div className="kaper-preview__meta">
          {showServings && (
            <span className="kaper-preview__meta-item">
              <IconUsers />
              {recipe.servings} servings
            </span>
          )}
          {hasTime && (
            <>
              {showServings && <span className="kaper-preview__meta-divider" aria-hidden="true" />}
              <span className="kaper-preview__meta-item">
                <IconTimer />
                {times.join(' · ')}
              </span>
            </>
          )}
          {showDifficulty && (
            <>
              {(showServings || hasTime) && (
                <span className="kaper-preview__meta-divider" aria-hidden="true" />
              )}
              <span
                className={`kaper-preview__meta-item kaper-preview__difficulty kaper-preview__difficulty--${recipe.difficulty}`}
              >
                <span className="kaper-preview__difficulty-label">{recipe.difficulty}</span>
                <span className="kaper-preview__difficulty-bars" aria-hidden="true">
                  <span className="kaper-preview__difficulty-bar" />
                  <span className="kaper-preview__difficulty-bar" />
                  <span className="kaper-preview__difficulty-bar" />
                </span>
              </span>
            </>
          )}
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="kaper-preview__tags">
            {recipe.tags.map((tag) => (
              <span key={tag} className="kaper-preview__tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="kaper-preview__body">
        <IngredientSection ingredients={recipe.ingredients} />

        <StepList steps={recipe.steps} assets={assets} filePath={filePath} />

        {isEmpty && (
          <div className="kaper-preview__nudge">
            {onSwitchToForm ? (
              <>
                <p className="kaper-preview__nudge-msg">
                  This recipe is empty. Add ingredients or steps in the Form tab — or write freeform
                  notes around the kaper block.
                </p>
                <button type="button" className="kaper-preview__nudge-btn" onClick={onSwitchToForm}>
                  Switch to Form
                </button>
              </>
            ) : (
              <p className="kaper-preview__nudge-msg">
                This recipe is empty. Open it on desktop to add ingredients and steps.
              </p>
            )}
          </div>
        )}
      </div>

      <a
        className="kaper-preview__kaper-link"
        href={KAPER_WEB_URL}
        onClick={(e) => {
          e.preventDefault();
          window.open(KAPER_WEB_URL, '_blank', 'noopener,noreferrer');
        }}
      >
        View on Kaper
        <IconExternalLink />
      </a>
    </article>
  );
}
