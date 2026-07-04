# Changelog

All notable changes to the Kaper plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses
[Semantic Versioning](https://semver.org/).

## [1.3.0] — 2026-07-04

### Added

- **In-app Cook Mode.** Step through a recipe one step at a time without leaving Obsidian — a full-screen sheet on mobile, a dockable side panel on desktop — with a progress bar and ← / → arrow-key navigation. Replaces the previous behaviour of opening kaper.me in the browser.
- **Reading-mode rendering.** Recipes now render as a read-only preview in Reading view, not just Live Preview, with a "Start Cooking" action there too.
- **"View on Kaper" link.** The recipe preview links out to the full Kaper web app at kaper.me, for anyone who still wants the browser experience.
- Recipe images now save under a per-recipe `_assets/{recipeId}/` folder, matching the Kaper web app's layout. Existing flat-named images from earlier versions still resolve correctly.

### Changed

- Internal: consolidated duplicated icon/callout/image-handling code across the preview and Cook mode into shared components; recipe "is this empty / does it have steps" logic is now a single set of helpers instead of being re-derived per call site.
- Internal: the Kaper tab strip now follows Obsidian's `--tab-*` theme variables, so themes that restyle tabs apply to Kaper's Preview/Form tabs too.
- Internal: the recipe parser's YAML round-trip now goes through Obsidian's own `parseYaml`/`stringifyYaml` instead of a bundled `js-yaml` dependency.

## [1.2.2] — 2026-06-06

### Fixed

- Timer and animation-frame calls now go through `window` (`window.setTimeout`, `window.requestAnimationFrame`) for correct behaviour in popped-out windows.

### Changed

- Internal: added an ESLint guardrail (`eslint-plugin-obsidianmd` + `typescript-eslint`) that reproduces the Obsidian plugin-review checks and runs in CI, plus type-safety cleanups across the recipe-id, settings, and form code paths.

## [1.2.1] — 2026-06-05

### Fixed

- `minAppVersion` raised to `1.4.4` to match the `app.fileManager.processFrontMatter` API the plugin relies on (added in Obsidian 1.4.4). The previous `1.4.0` floor would let the plugin install on app versions where recipe-id stamping throws.

## [1.2.0] — 2026-06-03

Thanks to [@bluelephant825](https://github.com/bluelephant825), whose
[PR #4](https://github.com/nikoneex/obsidian-kaper/pull/4) surfaced the image and
prep-time features and the time-field bug below. These were reimplemented to fit
the plugin's recipe format and code style.

### Added

- Cover images and per-step images now render in the recipe preview — resolved from vault paths, `_assets/` uploads, or remote URLs, and hidden gracefully when an image can't be loaded. (#4)
- Cover image upload in the recipe form's Basics section.
- Mobile support (read-only): recipes render on Obsidian mobile. Editing — the form editor, Cook mode, and recipe creation/conversion — stays desktop-only for now while the form is redesigned for small screens.
- Prep time now appears alongside cook time in the preview. (#4)

### Fixed

- Form time fields now show the recipe's saved prep/cook time on open instead of starting blank. (#4)

### Changed

- Recipe schema aligned with the Kaper web app: the legacy `equipment` and app-managed `_app` keys are no longer part of the format and are shed on save. The format doc now documents the canonical stable `kaper: r_<id>` marker.
- Step tip and warning callouts restyled to match the Kaper web app; the warning label is now "Heads up".
- README: documented that a remote `coverImage`/step image URL is fetched directly by Obsidian from a host outside Kaper's control, and added a Contributing section.
