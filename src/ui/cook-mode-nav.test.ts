import { describe, expect, it } from 'vitest';
import { isLastStep, nextIndex, prevIndex, progressPercent } from './cook-mode-nav';

describe('prevIndex', () => {
  it('decrements toward the first step', () => {
    expect(prevIndex(3)).toBe(2);
  });

  it('clamps at the first step', () => {
    expect(prevIndex(0)).toBe(0);
  });
});

describe('nextIndex', () => {
  it('advances toward the last step', () => {
    expect(nextIndex(0, 5)).toBe(1);
  });

  it('clamps at the last step', () => {
    expect(nextIndex(4, 5)).toBe(4);
  });
});

describe('isLastStep', () => {
  it('is true on the final step', () => {
    expect(isLastStep(4, 5)).toBe(true);
  });

  it('is false before the final step', () => {
    expect(isLastStep(0, 5)).toBe(false);
  });

  it('treats a single-step recipe as immediately last', () => {
    expect(isLastStep(0, 1)).toBe(true);
  });
});

describe('progressPercent', () => {
  it('reports completion for the current step', () => {
    expect(progressPercent(0, 4)).toBe(25);
    expect(progressPercent(3, 4)).toBe(100);
  });

  it('returns 0 when there are no steps', () => {
    expect(progressPercent(0, 0)).toBe(0);
  });
});
