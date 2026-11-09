import { IconMinus, IconPlus, IconUsers } from '../shared/icons';

/** Scaling below one serving has no sensible reading, so the stepper stops here. */
export const MIN_SERVINGS = 1;

interface ServingsStepperProps {
  /** A positive whole number — the host only renders the stepper for one. */
  value: number;
  onChange: (next: number) => void;
}

/**
 * The recipe scaler on the ingredients page: a −/+ stepper over the servings
 * count. Whole servings only, matching the Kaper web app; the host rescales the
 * ingredient amounts from the value it receives.
 */
export function ServingsStepper({ value, onChange }: ServingsStepperProps) {
  return (
    <div className="kaper-cook__servings" role="group" aria-label="Servings">
      <span className="kaper-cook__servings-label" aria-hidden="true">
        <IconUsers />
        Servings
      </span>
      <div className="kaper-cook__stepper">
        <button
          type="button"
          className="kaper-cook__stepper-btn"
          onClick={() => onChange(value - 1)}
          disabled={value <= MIN_SERVINGS}
          aria-label="Decrease servings"
        >
          <IconMinus />
        </button>
        <span className="kaper-cook__stepper-value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="kaper-cook__stepper-btn"
          onClick={() => onChange(value + 1)}
          aria-label="Increase servings"
        >
          <IconPlus />
        </button>
      </div>
    </div>
  );
}
