import { arrayMove } from '@dnd-kit/sortable';
import { RecipeStep } from '../../parser/types';
import { TimeInput } from '../TimeInput';
import { SectionProps } from './draft';

export function StepsSection({ draft, update }: SectionProps) {
  const addStep = () =>
    update({ ...draft, steps: [...draft.steps, { title: '' }] });

  const updateStep = (si: number, step: RecipeStep) => {
    const steps = [...draft.steps];
    steps[si] = step;
    update({ ...draft, steps });
  };

  const removeStep = (si: number) =>
    update({ ...draft, steps: draft.steps.filter((_, i) => i !== si) });

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= draft.steps.length) return;
    update({ ...draft, steps: arrayMove(draft.steps, from, to) });
  };

  return (
    <section className="kaper-form__section">
      <h3 className="kaper-form__section-label">Steps</h3>

      {draft.steps.map((step, si) => (
        <div key={si} className="kaper-form__step">
          <div className="kaper-form__step-header">
            <span className="kaper-form__step-num">{si + 1}</span>
            <input
              className="kaper-form__input kaper-form__input--step-title"
              type="text"
              placeholder="Step title"
              value={step.title}
              onChange={(e) => updateStep(si, { ...step, title: e.target.value })}
            />
            <TimeInput
              value={step.duration ?? ''}
              onChange={(v) => updateStep(si, { ...step, duration: v || undefined })}
            />
            <div className="kaper-form__step-actions">
              <button
                type="button"
                className="kaper-form__icon-btn"
                onClick={() => moveStep(si, si - 1)}
                disabled={si === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="kaper-form__icon-btn"
                onClick={() => moveStep(si, si + 1)}
                disabled={si === draft.steps.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="kaper-form__remove-btn"
                onClick={() => removeStep(si)}
                aria-label="Remove step"
              >
                ×
              </button>
            </div>
          </div>

          <div className="kaper-form__step-body">
            <div className="kaper-form__field">
              <label>Note</label>
              <textarea
                className="kaper-form__textarea"
                rows={2}
                placeholder="Instructions or note…"
                value={step.note ?? ''}
                onChange={(e) =>
                  updateStep(si, { ...step, note: e.target.value || undefined })
                }
              />
            </div>

            <div className="kaper-form__callout-row">
              <div className="kaper-form__field">
                <label>Tip</label>
                <input
                  className="kaper-form__input"
                  type="text"
                  placeholder="Optional tip…"
                  value={step.tip ?? ''}
                  onChange={(e) =>
                    updateStep(si, { ...step, tip: e.target.value || undefined })
                  }
                />
              </div>
              <div className="kaper-form__field">
                <label>Warning</label>
                <input
                  className="kaper-form__input"
                  type="text"
                  placeholder="Optional warning…"
                  value={step.warning ?? ''}
                  onChange={(e) =>
                    updateStep(si, { ...step, warning: e.target.value || undefined })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="kaper-form__add-step-btn" onClick={addStep}>
        + Step
      </button>
    </section>
  );
}
