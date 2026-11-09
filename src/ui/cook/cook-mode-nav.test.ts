import { describe, expect, it } from 'vitest';
import {
  INGREDIENTS_PAGE,
  firstPage,
  isLastPage,
  nextPage,
  prevPage,
  progressPercent,
} from './cook-mode-nav';

describe('firstPage', () => {
  it('opens on the ingredients page when the recipe has ingredients', () => {
    expect(firstPage(true)).toBe(INGREDIENTS_PAGE);
  });

  it('skips straight to step 1 when there are no ingredients', () => {
    expect(firstPage(false)).toBe(1);
  });
});

describe('prevPage', () => {
  it('steps back toward the first page', () => {
    expect(prevPage(3, 0)).toBe(2);
  });

  it('steps back from step 1 onto the ingredients page', () => {
    expect(prevPage(1, INGREDIENTS_PAGE)).toBe(INGREDIENTS_PAGE);
  });

  it('clamps at the ingredients page', () => {
    expect(prevPage(0, INGREDIENTS_PAGE)).toBe(0);
  });

  it('clamps at step 1 when the session skipped the ingredients page', () => {
    expect(prevPage(1, 1)).toBe(1);
  });
});

describe('nextPage', () => {
  it('advances from the ingredients page to step 1', () => {
    expect(nextPage(INGREDIENTS_PAGE, 5)).toBe(1);
  });

  it('advances toward the last step', () => {
    expect(nextPage(1, 5)).toBe(2);
  });

  it('clamps at the last step', () => {
    expect(nextPage(5, 5)).toBe(5);
  });
});

describe('isLastPage', () => {
  it('is true on the final step', () => {
    expect(isLastPage(5, 5)).toBe(true);
  });

  it('is false before the final step', () => {
    expect(isLastPage(1, 5)).toBe(false);
  });

  it('is false on the ingredients page even for a single-step recipe', () => {
    expect(isLastPage(INGREDIENTS_PAGE, 1)).toBe(false);
  });

  it('treats step 1 of a single-step recipe as immediately last', () => {
    expect(isLastPage(1, 1)).toBe(true);
  });
});

describe('progressPercent', () => {
  it('is empty on the ingredients page', () => {
    expect(progressPercent(INGREDIENTS_PAGE, 4)).toBe(0);
  });

  it('reports completion for the current step', () => {
    expect(progressPercent(1, 4)).toBe(25);
    expect(progressPercent(4, 4)).toBe(100);
  });

  it('returns 0 when there are no steps', () => {
    expect(progressPercent(0, 0)).toBe(0);
  });
});
