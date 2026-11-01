import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IngredientGroup } from '../../recipe/parser/types';
import { IngredientChecklist, ingredientKey } from './IngredientChecklist';

const noop = () => {};

function render(ingredients: IngredientGroup, checked: string[] = []) {
  return renderToStaticMarkup(
    <IngredientChecklist ingredients={ingredients} checked={new Set(checked)} onToggle={noop} />,
  );
}

/** Strips tags so assertions read against the text a cook actually sees. */
function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('IngredientChecklist', () => {
  it('renders every ingredient as an unchecked checkbox row', () => {
    const html = render({
      main: [
        { amount: 200, unit: 'g', name: 'spaghetti' },
        { amount: 3, unit: '', name: 'egg yolks' },
      ],
    });
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html).not.toContain('checked=""');
    // Amount and name are sibling spans (spaced by flex gap, not text), so
    // each is asserted on its own.
    expect(textOf(html)).toContain('200 g');
    expect(textOf(html)).toContain('spaghetti');
    expect(textOf(html)).toContain('egg yolks');
  });

  it('marks a row checked by its group + position key', () => {
    const html = render({ main: [{ amount: 1, unit: '', name: 'egg' }] }, [
      ingredientKey('main', 0),
    ]);
    expect(html).toContain('kaper-cook__ingredient--checked');
    expect(html).toContain('checked=""');
  });

  it('renders nothing when every group is empty, like the preview section', () => {
    expect(render({})).toBe('');
    expect(render({ main: [] })).toBe('');
  });

  it('keeps same-named ingredients in a group distinct', () => {
    expect(ingredientKey('sauce', 0)).not.toBe(ingredientKey('sauce', 1));
  });

  it('shows group headings only when more than one group has items', () => {
    const single = render({ main: [{ amount: 1, unit: '', name: 'egg' }], empty: [] });
    expect(single).not.toContain('kaper-cook__ingredient-group-name');

    const multi = render({
      pasta: [{ amount: 200, unit: 'g', name: 'spaghetti' }],
      sauce: [{ amount: 1, unit: '', name: 'egg' }],
    });
    expect(multi).toContain('kaper-cook__ingredient-group-name">pasta<');
    expect(multi).toContain('kaper-cook__ingredient-group-name">sauce<');
  });

  it('renders note, substitution, and optional marker like the preview does', () => {
    const html = render({
      main: [
        { amount: 100, unit: 'g', name: 'guanciale', note: 'thick-cut', sub: 'pancetta' },
        { amount: 25, unit: 'g', name: 'Parmesan', optional: true },
      ],
    });
    expect(textOf(html)).toContain('guanciale, thick-cut');
    expect(textOf(html)).toContain('or pancetta');
    expect(textOf(html)).toContain('Parmesan');
    expect(textOf(html)).toContain('(optional)');
    expect(html).toContain('kaper-cook__ingredient--optional');
  });
});
