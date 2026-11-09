import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AssetIO } from '../../obsidian/assets';
import type { IngredientGroup, RecipeModel, RecipeStep } from '../../recipe/parser/types';
import { CookMode } from './CookMode';

const assets = { resolveImage: (src: string) => src } as unknown as AssetIO;
const noop = () => {};

const PANTRY: IngredientGroup = {
  main: [
    { amount: 200, unit: 'g', name: 'spaghetti' },
    { amount: 3, unit: '', name: 'egg yolks' },
  ],
};

function recipe(
  steps: Partial<RecipeStep>[],
  extra: { ingredients?: IngredientGroup; servings?: number } = {},
): RecipeModel {
  return {
    title: 'Test Recipe',
    servings: 2,
    ingredients: {},
    steps,
    ...extra,
  } as unknown as RecipeModel;
}

function render(props: Partial<Parameters<typeof CookMode>[0]> & { recipe: RecipeModel }) {
  return renderToStaticMarkup(
    <CookMode assets={assets} filePath="recipe.kaper.md" onExit={noop} {...props} />,
  );
}

describe('CookMode', () => {
  describe('ingredients page', () => {
    const twoSteps = recipe([{ title: 'Chop' }, { title: 'Cook' }], { ingredients: PANTRY });

    it('opens on the ingredients checklist when the recipe has ingredients', () => {
      const html = render({ recipe: twoSteps });
      expect(html).toContain('Before you start');
      expect(html).toContain('spaghetti');
      expect(html).toContain('egg yolks');
      expect(html).toContain('type="checkbox"');
      expect(html).not.toContain('Step 1 of');
    });

    it('offers "Start cooking" instead of "Next", with Previous disabled', () => {
      const html = render({ recipe: twoSteps });
      expect(html).toContain('Start cooking');
      expect(html).not.toContain('>Next<');
      expect(html).toMatch(/kaper-cook__btn--prev"[^>]*disabled/);
    });

    it('shows an empty progress bar', () => {
      expect(render({ recipe: twoSteps })).toContain('--kaper-progress:0%');
    });

    it("shows the servings stepper at the recipe's own servings", () => {
      const html = render({ recipe: twoSteps });
      expect(html).toContain('aria-label="Increase servings"');
      expect(html).toMatch(/kaper-cook__stepper-value"[^>]*>2</);
    });

    it.each([
      ['zero', 0],
      ['negative', -1],
      ['fractional', 2.5],
      ['NaN', NaN],
      ['infinite', Infinity],
    ])('shows the amounts as written and no stepper when servings is %s', (_label, servings) => {
      const html = render({
        recipe: recipe([{ title: 'Chop' }], { ingredients: PANTRY, servings }),
      });
      expect(html).toContain('200 g');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Increase servings');
    });

    it('is skipped when the recipe has no ingredients', () => {
      const html = render({ recipe: recipe([{ title: 'Chop' }, { title: 'Cook' }]) });
      expect(html).not.toContain('Before you start');
      expect(html).toContain('Step 1 of 2');
    });

    it('is skipped when every ingredient group is empty', () => {
      const html = render({
        recipe: recipe([{ title: 'Chop' }], { ingredients: { main: [], sauce: [] } }),
      });
      expect(html).not.toContain('Before you start');
      expect(html).toContain('Step 1 of 1');
    });
  });

  it('renders the first step and the total count', () => {
    const html = render({ recipe: recipe([{ title: 'Chop' }, { title: 'Cook' }]) });
    expect(html).toContain('Chop');
    expect(html).toContain('Step 1 of 2');
  });

  it('shows "Next" and disables Previous on the first of multiple steps', () => {
    const html = render({ recipe: recipe([{ title: 'Chop' }, { title: 'Cook' }]) });
    expect(html).toContain('Next');
    expect(html).not.toContain('Finish');
    expect(html).toMatch(/kaper-cook__btn--prev"[^>]*disabled/);
  });

  it('shows "Finish" on a single-step (already-last) recipe with a full progress bar', () => {
    const html = render({ recipe: recipe([{ title: 'Only step' }]) });
    expect(html).toContain('Finish');
    expect(html).not.toContain('Next');
    expect(html).toContain('--kaper-progress:100%');
  });

  it('renders the back button only when onBack is provided', () => {
    const single = recipe([{ title: 'Only step' }]);
    expect(render({ recipe: single, onBack: noop })).toContain('aria-label="Exit cook mode"');
    expect(render({ recipe: single })).not.toContain('aria-label="Exit cook mode"');
  });

  it('renders nothing when the recipe has no steps, even with ingredients', () => {
    expect(render({ recipe: recipe([]) })).toBe('');
    expect(render({ recipe: recipe([], { ingredients: PANTRY }) })).toBe('');
  });
});
