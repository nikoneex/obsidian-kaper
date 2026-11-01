/**
 * Pure page-navigation helpers for Cook mode. A session is a run of pages: page
 * 0 is the ingredients overview (checklist + servings scaler) and pages
 * 1..totalSteps are the recipe steps, so a page number doubles as the 1-based
 * step number. Kept separate from the React component so the arithmetic
 * (clamping, boundaries, progress) can be unit tested without a DOM.
 */

/** The page before step 1: the ingredients checklist with the servings scaler. */
export const INGREDIENTS_PAGE = 0;

/**
 * Page a session opens on. A recipe with no ingredients skips straight to
 * step 1 — an empty checklist (and a scaler with nothing to scale) is no help.
 */
export function firstPage(hasIngredients: boolean): number {
  return hasIngredients ? INGREDIENTS_PAGE : 1;
}

/** Previous page, clamped so it never goes before the session's first page. */
export function prevPage(page: number, first: number): number {
  return Math.max(first, page - 1);
}

/** Next page, clamped so it never goes past the last step. */
export function nextPage(page: number, totalSteps: number): number {
  return Math.min(totalSteps, page + 1);
}

/** True when `page` is the final step — the point where "Next" becomes "Finish". */
export function isLastPage(page: number, totalSteps: number): boolean {
  return page === totalSteps;
}

/**
 * Completion percentage (0–100) for the progress bar: 0 on the ingredients page
 * (nothing cooked yet), 100 on the last step; 0 when there are no steps.
 */
export function progressPercent(page: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return (page / totalSteps) * 100;
}
