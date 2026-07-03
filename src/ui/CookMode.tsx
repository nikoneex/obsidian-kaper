import { CSSProperties, useCallback, useEffect, useState } from 'react';
import { AssetIO } from '../assets';
import { RecipeModel } from '../parser/types';
import { isLastStep, nextIndex, prevIndex, progressPercent } from './cook-mode-nav';
import { IconChevronLeft, IconChevronRight, IconTimer } from './icons';
import { PreviewImage } from './PreviewImage';
import { StepCallout } from './StepCallout';

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
 * Full-screen, one-step-at-a-time cooking view. Rendered inside a bottom-sheet
 * Modal (mobile) or a dockable side-panel leaf (desktop); navigation is via the
 * footer buttons (or the ← / → arrow keys). All colors come from Obsidian theme
 * variables so it matches the user's setup.
 */
export function CookMode({ recipe, assets, filePath, onExit, onBack }: CookModeProps) {
  const total = recipe.steps.length;
  const [index, setIndex] = useState(0);
  const step = recipe.steps[index];
  const isFirst = index === 0;
  const isLast = isLastStep(index, total);

  // Guards against `index` outliving the steps it points into (e.g. the recipe
  // prop is swapped for a shorter one without remounting). `steps[index]` is
  // typed non-optional, so without this the body below would throw on access.
  const progress = step ? progressPercent(index, total) : 0;
  const hasBody = !!(step && (step.note || step.tip || step.warning || step.image));

  const goPrev = useCallback(() => setIndex((i) => prevIndex(i)), []);
  const goNext = useCallback(() => {
    if (isLast) {
      onExit();
      return;
    }
    setIndex((i) => nextIndex(i, total));
  }, [isLast, total, onExit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    activeWindow.addEventListener('keydown', onKey);
    return () => activeWindow.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  if (!step) return null;

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
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="kaper-cook__progress-fill"
          style={{ '--kaper-progress': `${progress}%` } as CSSProperties}
        />
      </div>

      <main className="kaper-cook__body">
        <div className="kaper-cook__kicker">
          Step {index + 1} of {total}
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
          {isLast ? 'Finish' : 'Next'}
          <IconChevronRight />
        </button>
      </footer>
    </div>
  );
}
