import { AssetIO } from '../assets';
import { RecipeStep } from '../parser/types';
import { PreviewImage } from './PreviewImage';
import { StepCallout } from './StepCallout';

interface StepListProps {
  steps: RecipeStep[];
  assets: AssetIO;
  filePath: string;
}

/**
 * The "Instructions" section of the recipe preview — an ordered list of steps,
 * each with an optional note, tip, warning, and image. Renders nothing when the
 * recipe has no steps.
 */
export function StepList({ steps, assets, filePath }: StepListProps) {
  if (steps.length === 0) return null;

  return (
    <section className="kaper-preview__section">
      <h2 className="kaper-preview__section-title">Instructions</h2>
      <ol className="kaper-preview__steps">
        {steps.map((step, idx) => (
          <li key={`${idx}-${step.title}`} className="kaper-preview__step">
            <div className="kaper-preview__step-header">
              <span className="kaper-preview__step-num" aria-hidden="true">
                {idx + 1}
              </span>
              <h3 className="kaper-preview__step-title">{step.title}</h3>
              {step.duration && (
                <span className="kaper-preview__step-duration">{step.duration}</span>
              )}
            </div>
            {step.note && <p className="kaper-preview__step-note">{step.note}</p>}
            {/* `technique` is parsed and preserved on save but intentionally
                not rendered or exposed in the form yet — future enhancement. */}
            {step.tip && (
              <StepCallout block="kaper-preview" kind="tip">
                {step.tip}
              </StepCallout>
            )}
            {step.warning && (
              <StepCallout block="kaper-preview" kind="warning">
                {step.warning}
              </StepCallout>
            )}
            {step.image && (
              <PreviewImage
                className="kaper-preview__step-image"
                src={assets.resolveImage(step.image, filePath)}
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
