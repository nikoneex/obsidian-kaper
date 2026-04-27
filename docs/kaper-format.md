# Kaper File Format

A `.kaper.md` file is a standard Markdown file containing exactly one fenced ` ```kaper ``` ` code block of YAML. Everything outside the block is freeform Markdown (notes, backstory, photos). The YAML block holds all structured recipe data.

## File Structure

````markdown
<!-- Optional freeform Markdown before the block (preamble) -->

```kaper
version: 1
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
equipment:
  - large pot
  - frying pan
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
      sub: or use pancetta
    - amount: 2
      unit: ""
      name: egg yolks
    - amount: 50
      unit: g
      name: Pecorino Romano
      sub: or use Parmesan
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
```

<!-- Optional freeform Markdown after the block (postamble) -->

This recipe has been in the family for years. Use guanciale if you can find it.
````

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Recipe name. Used to generate the filename (`kebab-case.kaper.md`). |
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
| `equipment` | string[] | Kitchen tools or appliances needed. |
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
      sub: or use 1 whole egg
      optional: true
```

A recipe with a single group can use any name (e.g. `Main`, `Ingredients`, or the dish name).

### Ingredient Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | yes | Numeric quantity. Used for math-based scaling. Use `0` for uncountable items. |
| `unit` | string | yes | Unit of measure (e.g. `"g"`, `"cup"`, `"tbsp"`). Use `""` for countable items with no unit. |
| `name` | string | yes | Ingredient name. Referenced by steps via the `ingredients` list. |
| `sub` | string | no | Substitution hint (e.g. `"or use pancetta"`). |
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

Core field names that are reserved and cannot be used as capability names: `version`, `title`, `servings`, `difficulty`, `tags`, `time`, `equipment`, `ingredients`, `steps`, `source`, `yield`, `coverImage`.

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

## Filename Convention

Filenames are auto-generated from the `title` field using kebab-case slugification:

- `"Spaghetti Carbonara"` → `spaghetti-carbonara.kaper.md`
- `"Mom's Chicken Soup"` → `moms-chicken-soup.kaper.md`

The double extension (`.kaper.md`) signals intent while preserving Markdown rendering in VS Code, Obsidian, and GitHub.

## Parser Behavior

- If no ` ```kaper ``` ` block is found, the file is treated as a parse error.
- Malformed YAML returns a parse error with the YAML error message.
- Missing required fields (`title`, `servings`, `ingredients`, `steps`) return a parse error.
- Invalid `difficulty` value returns a parse error.
- Invalid capability blocks are silently skipped — they do not fail the whole parse.
- Markdown surrounding the block is preserved and displayed as-is (preamble before, postamble after).
