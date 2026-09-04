import { describe, it, expect } from 'vitest';
import { parseKaperYaml, serializeKaperYaml } from './recipe-parser';
import { RecipeModel } from './types';

/**
 * CANON / characterization tests.
 *
 * These pin the observable behavior of Obsidian's built-in YAML engine so any
 * change a recipe author can see is caught. Obsidian's `parseYaml` /
 * `stringifyYaml` are backed by eemeli/yaml (npm `yaml`, YAML 1.2 core schema),
 * disassembled from obsidian-1.13.7.asar (bL calls
 * `new Document(o, r, {nullStr:"", lineWidth:0, aliasDuplicateObjects:false})`).
 * The test stub in test/obsidian-yaml-stub.ts calls the same package with the
 * same options.
 *
 * They assert what the parser DOES today, not necessarily what is ideal. A
 * failure here after an engine swap is a signal to decide intentionally
 * ("is this divergence acceptable?"), not to blindly edit the expectation.
 *
 * The engine-sensitive surfaces, under eemeli/yaml 2.x:
 *   - yes/no/on/off are STRINGS (only true/false are booleans; YAML 1.2)
 *   - bare dates (2021-01-01) stay STRINGS (no auto-Date cast under YAML 1.2
 *     core schema)                                               [changed from js-yaml]
 *   - duplicate keys and tab indentation THROW
 *   - anchors/aliases (&/*) RESOLVE; merge keys (<<) do NOT      [changed from js-yaml]
 *   - stringify() uses `lineWidth: 0` — long strings NEVER fold  [changed from js-yaml]
 *   - stringify() QUOTES ambiguous strings so they round-trip as strings
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

describe('canon: bare dates are preserved as strings (YAML 1.2 core schema)', () => {
  // ENGINE NOTE: Obsidian's YAML is eemeli/yaml (YAML 1.2 core schema), which
  // does NOT auto-cast bare `YYYY-MM-DD` to a Date. The old js-yaml 4.x path
  // parsed the same input as a Date and our parser then dropped `source`
  // because a Date is not a string — a silent footgun. The current engine
  // preserves the user's typed value.
  it('keeps a bare ISO date in `source` as a string', () => {
    const r = parseKaperYaml(doc('source: 2021-01-01'));
    expect(r.recipe?.source).toBe('2021-01-01');
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

describe('canon: anchors and aliases resolve; merge keys do NOT (YAML 1.2)', () => {
  it('resolves an aliased ingredient group', () => {
    const r = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main: &m\n    - amount: 1\n      unit: g\n      name: salt\n  extra: *m\nsteps: []',
    );
    expect(r.recipe?.ingredients.extra[0].name).toBe('salt');
  });

  // ENGINE NOTE: `<<` merge keys are a YAML 1.1 feature and are NOT part of
  // the YAML 1.2 core schema. Obsidian's engine (eemeli/yaml, YAML 1.2) does
  // not merge — the second item is just `{ name: 'pepper' }` with no inherited
  // amount/unit. The old js-yaml 4.x path resolved merge keys as a legacy
  // convenience; recipes must not rely on that.
  it('does NOT resolve `<<` merge keys — the second item has only its own fields', () => {
    const r = parseKaperYaml(
      'version: 1\ntitle: x\nservings: 2\ningredients:\n  main:\n    - &base\n      amount: 1\n      unit: g\n      name: salt\n    - <<: *base\n      name: pepper\nsteps: []',
    );
    const main = r.recipe!.ingredients.main;
    expect(main[1].name).toBe('pepper');
    expect(main[1].amount).toBe(0); // NOT inherited from &base
    expect(main[1].unit).toBe(''); //  NOT inherited from &base
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

  // ENGINE-SENSITIVE: line wrapping. Obsidian's stringifyYaml calls eemeli/yaml
  // with `lineWidth: 0` (disassembled from obsidian-1.13.7.asar), so long
  // strings are NEVER folded — they stay on one line no matter how long. The
  // old js-yaml 4.x default (lineWidth: 80) would have folded a ~90-char value
  // with `>-`; that no longer happens on Obsidian 1.13+.
  it('does NOT fold a long source — Obsidian passes lineWidth:0 (unlimited)', () => {
    const longSource =
      'https://example.com/recipes/2026/the-very-long-canonical-slug-for-this-dish-name-x';
    expect(longSource.length).toBeGreaterThan(80);
    const out = serializeKaperYaml(makeRecipe({ title: 'T', source: longSource }));
    expect(out).toContain(`source: ${longSource}\n`);
    expect(out).not.toContain('>-');
    // …and it still round-trips back to the original string.
    expect(parseKaperYaml(out).recipe?.source).toBe(longSource);
  });
});
