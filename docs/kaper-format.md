# Kaper File Format

A Kaper recipe is a standard `.md` file with two markers:

1. **A `kaper:` frontmatter key** — identifies the file as a recipe. The canonical value is a stable id, `kaper: r_<id>` (an `r_` prefix plus 10 URL-safe characters). The legacy value `kaper: true` is still accepted; the app stamps it with a generated id on the next save.
2. **A fenced ` ```kaper ``` ` code block of YAML** — holds the structured recipe data.

Everything outside the YAML block is freeform Markdown (notes, backstory, photos).

## File Structure

````markdown
---
kaper: r_V1StGXR8Z5
---

<!-- Optional freeform Markdown before the block (preamble) -->

```kaper
title: Spaghetti Carbonara
servings: 2
difficulty: medium
tags:
  - pasta
  - italian
  - weeknight
time:
  prep: 10m
  cook: 20m
  total: 30m
coverImage: ./cover.jpg
source: https://example.com/carbonara
yield: 2 large bowls
ingredients:
  Main:
    - amount: 200
      unit: g
      name: spaghetti
    - amount: 100
      unit: g
      name: guanciale
      sub: pancetta
    - amount: 2
      unit: ""
      name: egg yolks
    - amount: 50
      unit: g
      name: Pecorino Romano
      sub: Parmesan
      optional: false
steps:
  - title: Boil the pasta
    ingredients:
      - spaghetti
    duration: 10m
    note: Salt the water generously — it should taste like the sea.
  - title: Render the guanciale
    ingredients:
      - guanciale
    duration: 5m
    tip: Cook on medium heat to render fat without burning.
  - title: Make the egg mixture
    ingredients:
      - egg yolks
      - Pecorino Romano
    technique: Whisk yolks and cheese off-heat to avoid scrambling.
  - title: Combine
    warning: Do NOT add the egg mixture over direct heat — carry-over heat from the pasta is enough.
    image: ./steps/combine.jpg
version: 1
```

<!-- Optional freeform Markdown after the block (postamble) -->

This recipe has been in the family for years. Use guanciale if you can find it.
````

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Recipe name. Independent of the on-disk filename. |
| `servings` | number | Base serving count. Used by the ScalingEngine. |
| `ingredients` | object | Named groups of ingredient objects (see below). |
| `steps` | array | Ordered list of step objects (see below). |

## Optional Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Format version. Defaults to `1` if omitted. |
| `difficulty` | `"easy"` \| `"medium"` \| `"hard"` | Recipe difficulty. Any other value is a parse error. |
| `tags` | string[] | Free-form labels for filtering (e.g. `["pasta", "weeknight"]`). |
| `time.prep` | string | Prep time (e.g. `"15m"`, `"1h"`). |
| `time.cook` | string | Active cook time. |
| `time.total` | string | Total elapsed time. |
| `coverImage` | string | Relative path to a cover image (e.g. `"./cover.jpg"`). |
| `source` | string | Attribution URL. |
| `yield` | string | Human-readable yield description (e.g. `"12 cookies"`, `"1 loaf"`). |

## Ingredient Groups

`ingredients` is a YAML object where each key is a group name and each value is an array of ingredient objects.

```yaml
ingredients:
  Main:
    - amount: 200
      unit: g
      name: spaghetti
  For the sauce:
    - amount: 2
      unit: ""
      name: egg yolks
      note: at room temperature
      sub: 1 whole egg
      optional: true
```

A recipe with a single group can use any name (e.g. `Main`, `Ingredients`, or the dish name).

### Ingredient Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | yes | Numeric quantity. Used for math-based scaling. Use `0` for uncountable items. |
| `unit` | string | yes | Unit of measure (e.g. `"g"`, `"cup"`, `"tbsp"`). Use `""` for countable items with no unit. |
| `name` | string | yes | Ingredient name. Referenced by steps via the `ingredients` list. Keep prep detail out of this field so steps can match it. |
| `note` | string | no | Prep or state detail (e.g. `"finely chopped"`, `"room temperature"`). Rendered after the name as `Walnuts, finely chopped`. |
| `sub` | string | no | Substitution hint (e.g. `"pancetta"`). Rendered with a leading "or" — do not write the word yourself. |
| `optional` | boolean | no | Whether the ingredient is optional. Defaults to `false`. |

## Steps

`steps` is an ordered array of step objects.

```yaml
steps:
  - title: Boil the pasta
    ingredients:
      - spaghetti
    duration: 10m
    note: Salt the water well.
  - title: Make the sauce
    technique: Whisk constantly over low heat.
    tip: Remove from heat before adding cheese.
    warning: Do not let the eggs scramble.
    image: ./steps/sauce.jpg
```

### Step Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Instruction text for this step. |
| `ingredients` | string[] | no | Names of ingredients used in this step. Must match names in the `ingredients` block. |
| `duration` | string | no | Time for this step (e.g. `"10m"`, `"1h30m"`). Renders a tappable timer in Cook Mode. |
| `tip` | string | no | Helpful suggestion callout. |
| `warning` | string | no | Important caution callout. |
| `technique` | string | no | Technique explanation callout. |
| `note` | string | no | General note callout. |
| `image` | string | no | Relative path to a step image (e.g. `"./steps/step-3.jpg"`). |

Only one of `tip`, `warning`, `technique`, or `note` should be used per step.

## Capabilities (Extension Fields)

Any YAML key not in the core field set is treated as a **capability block** — an extension. Unknown capabilities are stored as-is and ignored by the core app. Registered capability parsers can validate and process them.

```yaml
# Example: a hypothetical wine pairing capability
wine:
  red: Chianti Classico
  white: ~
```

Core field names that are reserved and cannot be used as capability names: `version`, `title`, `servings`, `difficulty`, `tags`, `time`, `ingredients`, `steps`, `source`, `yield`, `coverImage`. The dropped keys `_app` and `equipment` (below) are also reserved — they are recognised and shed, never treated as capabilities.

## Dropped / Legacy Fields

These keys were part of an earlier schema and are no longer active. They are recognised by the parser so they're neither treated as capability blocks nor round-tripped — a recipe still carrying them sheds them on its next save:

| Field | Notes |
|-------|-------|
| `_app` | Per-recipe app metadata (favourites, last-cooked). Now stored in the vault's `meta.json`, not in the recipe file. |
| `equipment` | Kitchen tools/appliances. Parked until the app renders it again. |

## Full Minimal Example

```yaml
version: 1
title: Soft-Boiled Eggs
servings: 2
ingredients:
  Main:
    - amount: 2
      unit: ""
      name: large eggs
steps:
  - title: Boil for 7 minutes
    ingredients:
      - large eggs
    duration: 7m
    tip: Start from cold water for consistent results.
```

## File Naming

Recipes are plain `.md` files. **The filename is independent of the recipe's `title` field** — title edits don't rename the file, and renames don't change the title. Each app provides a rename action when you want them to match.

New recipes default to `Untitled.md` with collision-suffix (`Untitled 2.md`, `Untitled 3.md`, etc.). Rename via Kaper's sidebar context menu, or Obsidian's native rename (F2 / right-click).

### Recipe identification

A `.md` file is treated as a recipe iff its frontmatter contains a non-empty `kaper:` value — the canonical stable id (`kaper: r_<id>`) or the legacy `kaper: true`:

````markdown
---
kaper: r_V1StGXR8Z5
---

```kaper
...
```
````

A file marked `kaper: true` is stamped with a generated `r_<id>` on its next save; the id is then stable across renames and edits. Other frontmatter keys you add (`tags`, `aliases`, etc.) are preserved on save.

### Legacy `.kaper.md` files

Files ending in `.kaper.md` from earlier versions are still read as recipes during the deprecation transition. After the transition window, only frontmatter-marked files will be detected.

## Parser Behavior

- If no ` ```kaper ``` ` block is found, the file is treated as a parse error.
- Malformed YAML returns a parse error with the YAML error message.
- Missing required fields (`title`, `servings`, `ingredients`, `steps`) return a parse error.
- Invalid `difficulty` value returns a parse error.
- Invalid capability blocks are silently skipped — they do not fail the whole parse.
- Markdown surrounding the block is preserved and displayed as-is (preamble before, postamble after).
