/**
 * Pure step-navigation helpers for Cook mode. Kept separate from the React
 * component so the index arithmetic (clamping, boundaries, progress) can be unit
 * tested without a DOM.
 */

/** Previous step index, clamped so it never goes below the first step. */
export function prevIndex(index: number): number {
  return Math.max(0, index - 1);
}

/** Next step index, clamped so it never goes past the last step. */
export function nextIndex(index: number, total: number): number {
  return Math.min(total - 1, index + 1);
}

/** True when `index` is the final step — the point where "Next" becomes "Finish". */
export function isLastStep(index: number, total: number): boolean {
  return index === total - 1;
}

/** Completion percentage (0–100) for the progress bar; 0 when there are no steps. */
export function progressPercent(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index + 1) / total) * 100;
}
