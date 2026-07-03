import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AssetIO } from '../assets';
import type { RecipeModel, RecipeStep } from '../parser/types';
import { CookMode } from './CookMode';

const assets = { resolveImage: (src: string) => src } as unknown as AssetIO;
const noop = () => {};

function recipe(steps: Partial<RecipeStep>[]): RecipeModel {
  return { title: 'Test Recipe', steps } as unknown as RecipeModel;
}

function render(props: Partial<Parameters<typeof CookMode>[0]> & { recipe: RecipeModel }) {
  return renderToStaticMarkup(
    <CookMode assets={assets} filePath="recipe.kaper.md" onExit={noop} {...props} />,
  );
}

describe('CookMode', () => {
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

  it('renders nothing when the recipe has no steps', () => {
    expect(render({ recipe: recipe([]) })).toBe('');
  });
});
