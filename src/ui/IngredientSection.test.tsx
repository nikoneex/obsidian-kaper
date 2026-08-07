import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IngredientSection } from './IngredientSection';
import { IngredientAmount } from '../parser/types';

function render(items: IngredientAmount[]) {
  return renderToStaticMarkup(<IngredientSection ingredients={{ main: items }} />);
}

/** Strips tags so assertions read against the text a cook actually sees. */
function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('IngredientSection', () => {
  it('renders a note as a comma-joined detail after the name', () => {
    const text = textOf(
      render([{ amount: 50, unit: 'g', name: 'Walnuts', note: 'finely chopped' }]),
    );
    expect(text).toContain('Walnuts, finely chopped');
  });

  it('supplies the leading "or" for a sub, so authors write only the replacement', () => {
    const text = textOf(render([{ amount: 100, unit: 'g', name: 'guanciale', sub: 'pancetta' }]));
    expect(text).toContain('or pancetta');
    expect(text).not.toContain('or or');
  });

  it('keeps note and sub distinct when an ingredient has both', () => {
    const html = render([
      { amount: 2, unit: '', name: 'egg yolks', note: 'at room temperature', sub: '1 whole egg' },
    ]);
    expect(textOf(html)).toContain('egg yolks, at room temperature');
    expect(textOf(html)).toContain('or 1 whole egg');
    expect(html).toContain('kaper-preview__ingredient-note');
    expect(html).toContain('kaper-preview__ingredient-sub');
  });

  it('renders no stray comma when an ingredient has no note', () => {
    expect(textOf(render([{ amount: 1, unit: '', name: 'egg' }]))).toContain('1 egg');
    expect(render([{ amount: 1, unit: '', name: 'egg' }])).not.toContain(
      'kaper-preview__ingredient-note',
    );
  });
});
