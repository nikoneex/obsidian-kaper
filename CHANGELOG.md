# Changelog

All notable changes to the Kaper plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses
[Semantic Versioning](https://semver.org/).

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

- Step tip and warning callouts restyled to match the Kaper web app; the warning label is now "Heads up".
- README: documented that a remote `coverImage`/step image URL is fetched directly by Obsidian from a host outside Kaper's control, and added a Contributing section.
