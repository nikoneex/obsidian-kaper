import { describe, it, expect } from 'vitest';
import { parseKaperYaml, serializeKaperYaml } from './recipe-parser';
import { RecipeModel } from './types';

/**
 * CANON / characterization tests.
 *
 * These pin the *current* YAML engine's observable behavior (js-yaml 4.1.x)
 * so that swapping the engine — e.g. to Obsidian's `parseYaml`/`stringifyYaml`
 * — is caught the moment it changes anything a recipe author can observe.
 *
 * They assert what the parser DOES today, not necessarily what is ideal. A
 * failure here after an engine swap is a signal to decide intentionally
 * ("is this divergence acceptable?"), not to blindly edit the expectation.
 *
 * The engine-sensitive surfaces, confirmed empirically against js-yaml 4.1.1:
 *   - yes/no/on/off are STRINGS (only true/false are booleans)   [YAML 1.1 differs]
 *   - bare dates (2021-01-01) parse to Date objects, so they are LOST from
 *     string-typed fields like `source`                          [engine-specific]
 *   - duplicate keys and tab indentation THROW
 *   - merge keys (<<) and anchors/aliases (&/*) are RESOLVED
 *   - dump() QUOTES ambiguous strings so they round-trip as strings
 */

// Minimal valid doc with extra top-level lines appended.
function doc(extra: string): string {
  return `version: 1\ntitle: x\nservings: 2\ningredients:\n  main: []\nsteps: []\n${extra}`;
}

// Minimal valid doc whose single main ingredient carries the given field lines.
function ingredientDoc(fieldLines: string): string {
  const indented = fieldLines
    .split('\n')
    .map((l, i) => (i === 0 ? `    - ${l}` : `      ${l}`))
    .join('\n');
  return `version: 1\ntitle: x\nservings: 2\ningredients:\n  main:\n${indented}\nsteps: []\n`;
}

function makeRecipe(overrides: Partial<RecipeModel> = {}): RecipeModel {
  return {
    version: 1,
    title: 'Test',
    servings: 2,
    ingredients: { main: [] },
    steps: [],
    capabilities: new Map(),
    ...overrides,
  };
}

describe('canon: boolean-ish scalars (yes/no/on/off are strings, not booleans)', () => {
  it('keeps `title: yes` as the string "yes"', () => {
    const r = parseKaperYaml(doc('source: yes'));
    expect(r.recipe?.source).toBe('yes');
  });

  it('treats `optional: yes` as a non-boolean → optional dropped', () => {
    const r = parseKaperYaml(ingredientDoc('amount: 1\nunit: g\nname: salt\noptional: yes'));
    expect(r.recipe?.ingredients.main[0].optional).toBeUndefined();
  });

  it('treats `optional: true` as a real boolean', () => {
    const r = parseKaperYaml(ingredientDoc('amount: 1\nunit: g\nname: salt\noptional: true'));
    expect(r.recipe?.ingredients.main[0].optional).toBe(true);
  });

  it('keeps `source: no` as the string "no" (no Norway problem here)', () => {
    const r = parseKaperYaml(doc('source: no'));
    expect(r.recipe?.source).toBe('no');
  });
});

describe('canon: bare dates parse to Date and are lost from string fields', () => {
  it('drops a bare ISO date from `source` (Date is not a string)', () => {
    const r = parseKaperYaml(doc('source: 2021-01-01'));
    expect(r.recipe?.source).toBeUndefined();
  });

  it('keeps a QUOTED date string in `source`', () => {
    const r = parseKaperYaml(doc('source: "2021-01-01"'));
    expect(r.recipe?.source).toBe('2021-01-01');
  });

  it('keeps a URL source unchanged', () => {
    const r = parseKaperYaml(doc('source: https://example.com/recipe'));
    expect(r.recipe?.source).toBe('https://example.com/recipe');
  });
});

describe('canon: numeric coercion', () => {
  it('parses hex servings (0x10 → 16)', () => {
    const r = parseKaperYaml(doc('servings: 0x10').replace('servings: 2\n', ''));
    expect(r.recipe?.servings).toBe(16);
  });

  it('parses leading-zero amount as decimal (017 → 17)', () => {
    const r = parseKaperYaml(ingredientDoc('amount: 017\nunit: g\nname: salt'));
    expect(r.recipe?.ingredients.main[0].amount).toBe(17);
  });

  it('treats a quoted number as a string → amount falls back to 0', () => {
    const r = parseKaperYaml(ingredientDoc('amount: "5"\nunit: g\nname: salt'));
    expect(r.recipe?.ingredients.main[0].amount).toBe(0);
  });

  it('parses a decimal amount (2.5)', () => {
    const r = parseKaperYaml(ingredientDoc('amount: 2.5\nunit: g\nname: salt'));
    expect(r.recipe?.ingredients.main[0].amount).toBe(2.5);
  });
});

describe('canon: null / empty scalars', () => {
  it('normalizes an empty title to ""', () => {
    const r = parseKaperYaml(doc('').replace('title: x\n', 'title:\n'));
    expect(r.recipe?.title).toBe('');
  });

  it('normalizes an empty ingredient name to ""', () => {
    const r = parseKaperYaml(ingredientDoc('amount: 1\nunit: g\nname:'));
    expect(r.recipe?.ingredients.main[0].name).toBe('');
  });
});

describe('canon: structural errors throw → parseError', () => {
  it('rejects duplicate mapping keys', () => {
    const r = parseKaperYaml(doc('source: a\nsource: b'));
    expect(r.recipe).toBeNull();
    expect(r.parseError).toMatch(/YAML parse error/);
  });

  it('rejects tab indentation', () => {
    const r = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n\tmain: []\nsteps: []',
    );
    expect(r.recipe).toBeNull();
    expect(r.parseError).toMatch(/YAML parse error/);
  });
});

describe('canon: anchors, aliases and merge keys are resolved', () => {
  it('resolves an aliased ingredient group', () => {
    const r = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main: &m\n    - amount: 1\n      unit: g\n      name: salt\n  extra: *m\nsteps: []',
    );
    expect(r.recipe?.ingredients.extra[0].name).toBe('salt');
  });

  it('resolves a merge key on an ingredient item', () => {
    const r = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main:\n    - &base\n      amount: 1\n      unit: g\n      name: salt\n    - <<: *base\n      name: pepper\nsteps: []',
    );
    const main = r.recipe!.ingredients.main;
    expect(main[1]).toMatchObject({ amount: 1, unit: 'g', name: 'pepper' });
  });
});

describe('canon: flow style parses like block style', () => {
  it('parses flow-style tags', () => {
    const r = parseKaperYaml(doc('tags: [italian, pasta]'));
    expect(r.recipe?.tags).toEqual(['italian', 'pasta']);
  });

  it('parses an inline (flow) ingredient mapping', () => {
    const r = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main: [{amount: 1, unit: g, name: salt}]\nsteps: []',
    );
    expect(r.recipe?.ingredients.main[0]).toMatchObject({ amount: 1, unit: 'g', name: 'salt' });
  });
});

describe('canon: serialize quotes ambiguous strings so they round-trip', () => {
  it.each([
    ['yes', 'yes'],
    ['no', 'no'],
    ['123', '123'],
    ['2021-01-01', '2021-01-01'],
    ['null', 'null'],
  ])('round-trips a source of %j back to a string', (value) => {
    const serialized = serializeKaperYaml(makeRecipe({ source: value }));
    const reparsed = parseKaperYaml(serialized);
    expect(reparsed.recipe?.source).toBe(value);
  });
});

describe('canon: exact serialized output (locks key order, quoting, indentation, wrapping)', () => {
  it('serializes a full recipe to a stable string', () => {
    const recipe = makeRecipe({
      title: 'Pasta',
      servings: 4,
      difficulty: 'medium',
      time: { prep: '10m', cook: '20m' },
      tags: ['italian', 'pasta'],
      ingredients: {
        sauce: [{ amount: 100, unit: 'g', name: 'guanciale', note: 'diced', sub: 'pancetta' }],
      },
      steps: [{ title: 'Boil water', duration: '5m', note: 'salt heavily' }],
      source: 'nonna',
      capabilities: new Map([['nutrition', { calories: 500 }]]),
    });
    expect(serializeKaperYaml(recipe)).toMatchInlineSnapshot(`
      "title: Pasta
      servings: 4
      ingredients:
        sauce:
          - amount: 100
            unit: g
            name: guanciale
            note: diced
            sub: pancetta
      steps:
        - title: Boil water
          duration: 5m
          note: salt heavily
      difficulty: medium
      time:
        prep: 10m
        cook: 20m
      tags:
        - italian
        - pasta
      source: nonna
      nutrition:
        calories: 500
      version: 1
      "
    `);
  });

  it('ends with a single trailing newline and emits no code fences', () => {
    const out = serializeKaperYaml(makeRecipe({ title: 'Test' }));
    expect(out.endsWith('\n')).toBe(true);
    expect(out).not.toContain('```');
  });

  // ENGINE-SENSITIVE: line wrapping. Obsidian's stringifyYaml exposes no
  // options and uses js-yaml's default lineWidth of 80, so an ~90-char field
  // folds with a `>-` block scalar. (Under the old js-yaml lineWidth:100 path
  // this stayed on one line — the divergence the swap introduces. Cosmetic:
  // the folded form round-trips to the same string.)
  it('folds a ~90-char source with `>-` at lineWidth 80', () => {
    const longSource =
      'https://example.com/recipes/2026/the-very-long-canonical-slug-for-this-dish-name-x';
    expect(longSource.length).toBeGreaterThan(80);
    expect(longSource.length).toBeLessThan(100);
    const out = serializeKaperYaml(makeRecipe({ title: 'T', source: longSource }));
    expect(out).toContain('source: >-\n');
    // …and it still round-trips back to the original string.
    expect(parseKaperYaml(out).recipe?.source).toBe(longSource);
  });
});
