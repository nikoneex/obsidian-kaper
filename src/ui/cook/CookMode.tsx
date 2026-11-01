import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { AssetIO } from '../../obsidian/assets';
import { hasIngredients } from '../../recipe/model';
import { RecipeModel, RecipeStep } from '../../recipe/parser/types';
import { isScalableServings, scaleRecipe } from '../../recipe/scaling';
import { firstPage, isLastPage, nextPage, prevPage, progressPercent } from './cook-mode-nav';
import { IngredientChecklist } from './IngredientChecklist';
import { ServingsStepper } from './ServingsStepper';
import { IconChevronLeft, IconChevronRight, IconTimer } from '../shared/icons';
import { PreviewImage } from '../shared/PreviewImage';
import { StepCallout } from '../shared/StepCallout';

interface CookModeProps {
  recipe: RecipeModel;
  assets: AssetIO;
  filePath: string;
  /** Ends the session — reached via the footer "Finish" on the last step. */
  onExit: () => void;
  /**
   * When provided, renders an in-bar back button wired to it. The mobile modal
   * passes one as its explicit exit; the desktop side-panel leaf omits it,
   * deferring to Obsidian's own tab close rather than a redundant control.
   */
  onBack?: () => void;
}

/**
 * Full-screen cooking view: an ingredients checklist with a servings scaler,
 * then one step at a time. Rendered inside a bottom-sheet Modal (mobile) or a
 * dockable side-panel leaf (desktop); navigation is via the footer buttons (or
 * the ← / → arrow keys). All colors come from Obsidian theme variables so it
 * matches the user's setup.
 */
export function CookMode({ recipe, assets, filePath, onExit, onBack }: CookModeProps) {
  const total = recipe.steps.length;
  const first = firstPage(hasIngredients(recipe));
  const [page, setPage] = useState(first);
  const [servings, setServings] = useState(recipe.servings);
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());

  // A recipe whose servings count is 0, negative, fractional, or non-finite
  // has no ratio to scale by: the checklist shows the amounts as written and
  // the stepper stays hidden. (A negative count would also make the engine
  // throw mid-render, which blanks the whole Cook mode root.)
  const scalable = isScalableServings(recipe.servings);
  // Scaling only touches ingredient amounts, so it's recomputed when the
  // servings change rather than on every page turn.
  const scaled = useMemo(
    () => (scalable ? scaleRecipe(recipe, servings) : recipe),
    [recipe, scalable, servings],
  );

  // Page 0 is the ingredients overview; page n (n ≥ 1) is step n.
  const step: RecipeStep | undefined = page >= 1 ? recipe.steps[page - 1] : undefined;
  const isFirst = page === first;
  const isLast = isLastPage(page, total);
  const progress = progressPercent(page, total);
  const hasBody = !!(step && (step.note || step.tip || step.warning || step.image));
  const nextLabel = page < 1 ? 'Start cooking' : isLast ? 'Finish' : 'Next';

  const goPrev = useCallback(() => setPage((p) => prevPage(p, first)), [first]);
  const goNext = useCallback(() => {
    if (isLast) {
      onExit();
      return;
    }
    setPage((p) => nextPage(p, total));
  }, [isLast, total, onExit]);

  const toggleIngredient = useCallback((key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    activeWindow.addEventListener('keydown', onKey);
    return () => activeWindow.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // Nothing to cook through, or `page` has outlived the steps it points into
  // (e.g. the recipe prop is swapped for a shorter one without remounting).
  if (total === 0 || (page >= 1 && !step)) return null;

  return (
    <div className="kaper-cook">
      <header className="kaper-cook__bar">
        {onBack && (
          <button className="kaper-cook__icon-btn" onClick={onBack} aria-label="Exit cook mode">
            <IconChevronLeft />
          </button>
        )}
        <span className="kaper-cook__title">{recipe.title}</span>
      </header>

      <div
        className="kaper-cook__progress"
        role="progressbar"
        aria-valuenow={page}
        aria-valuemin={first}
        aria-valuemax={total}
      >
        <div
          className="kaper-cook__progress-fill"
          style={{ '--kaper-progress': `${progress}%` } as CSSProperties}
        />
      </div>

      <main className="kaper-cook__body">
        {step ? (
          <>
            <div className="kaper-cook__kicker">
              Step {page} of {total}
            </div>
            <h1 className="kaper-cook__step-title">{step.title}</h1>

            {step.duration && (
              <div className="kaper-cook__chip">
                <IconTimer />
                {step.duration}
              </div>
            )}

            {hasBody && <hr className="kaper-cook__divider" />}

            {step.note && <p className="kaper-cook__note">{step.note}</p>}

            {step.tip && (
              <StepCallout block="kaper-cook" kind="tip">
                {step.tip}
              </StepCallout>
            )}

            {step.warning && (
              <StepCallout block="kaper-cook" kind="warning">
                {step.warning}
              </StepCallout>
            )}

            {step.image && (
              <PreviewImage
                className="kaper-cook__image"
                src={assets.resolveImage(step.image, filePath)}
              />
            )}
          </>
        ) : (
          <>
            <div className="kaper-cook__kicker">Before you start</div>
            <h1 className="kaper-cook__step-title">Ingredients</h1>

            {scalable && <ServingsStepper value={servings} onChange={setServings} />}

            <IngredientChecklist
              ingredients={scaled.ingredients}
              checked={checked}
              onToggle={toggleIngredient}
            />
          </>
        )}
      </main>

      <footer className="kaper-cook__nav">
        <button
          className="kaper-cook__btn kaper-cook__btn--prev"
          onClick={goPrev}
          disabled={isFirst}
        >
          <IconChevronLeft />
          Previous
        </button>
        <button className="kaper-cook__btn kaper-cook__btn--next" onClick={goNext}>
          {nextLabel}
          <IconChevronRight />
        </button>
      </footer>
    </div>
  );
}
