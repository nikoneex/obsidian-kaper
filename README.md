# Kaper for Obsidian

Bring [Kaper](https://kaper.me) recipes into your Obsidian vault. Any markdown file with a ` ```kaper ` block renders as a structured recipe — preview and form editor — while the surrounding markdown stays as regular Obsidian prose.

#### Live Preview Mode

![Kaper recipe preview](assets/preview.png)

## What is Kaper?

[Kaper](https://kaper.me) is a local-first recipe manager. Your recipes live as plain markdown files in a folder you control — no cloud, no lock-in, no account. Open the same vault in:

- **The web app** at [kaper.me](https://kaper.me) — works in any modern browser, no install.
- **This Obsidian plugin** — edit recipes alongside your notes, with full Live Preview integration.
- **The desktop app** *coming soon — Electron-based, full file-system access.

The killer feature: **Cook Mode** at [kaper.me](https://kaper.me). Big-text, hands-free, gesture-friendly view for actually cooking from the recipe. Click the **Cook mode** button in any rendered Kaper block and you'll land in the web app's Cook Mode for that recipe — no copy-paste, no app switch, just the recipe ready to follow at the stove.

## Features

- **In-place rendering** — `kaper` code blocks render as a structured recipe view in Live Preview. Markdown around the block (notes, headings, links) is unaffected.
- **Form editor** — full editing for title, servings, difficulty, prep/cook time, tags, ingredient groups (add/remove/reorder by drag), steps (add/remove/reorder, with note, tip, warning, technique, duration).
- **Preview** — title, servings, difficulty bars, tag pills, ingredient groups, numbered steps with tip/warning callouts. Styled with your Obsidian accent color so it adapts to any theme.
- **Cook Mode** — one click jumps to [kaper.me](https://kaper.me?from=obsidian) in your browser, ready to cook.
- **Auto-save** — every form change writes back to the YAML; no save button.
- **Ribbon button** — one click to create a new recipe in the active folder.

#### Form Mode

![Form editor](assets/form.png)

## File format

Kaper recipes are plain markdown files with two markers:

1. A frontmatter `kaper: true` flag (this is what marks the file as a recipe).
2. A ` ```kaper ` fenced YAML block somewhere in the body (this is the recipe data).

Anything outside the YAML block is rendered as normal markdown — perfect for notes, intros, and links.

````markdown
---
kaper: true
---

A true Roman classic — no cream, no shortcuts.

```kaper
title: Classic Pasta Carbonara
servings: 2
difficulty: medium
time:
  cook: 20m
tags: [italian, pasta, weeknight]
ingredients:
  pasta:
    - amount: 200
      unit: g
      name: spaghetti
  sauce:
    - amount: 100
      unit: g
      name: guanciale
      sub: pancetta
steps:
  - title: Bring a large pot of salted water to a boil.
    note: The water should taste like the sea.
  - title: Cook guanciale in a cold skillet until crispy.
    duration: 8m
    technique: Starting cold renders the fat without burning.
version: 1
```

Tips and notes about the recipe go here as regular markdown.
````

Required fields: `title`, `servings`, `ingredients`, `steps`.

## Usage

![Editing a recipe](assets/demo.gif)

- **Create a recipe** — click the utensils icon in the left ribbon, or run **Kaper: Create recipe** from the command palette.
- **Convert an existing note** — run **Kaper: Convert current note to Kaper recipe** from the command palette to add the frontmatter and starter block to any open `.md` file.
- **View / edit** — open any kaper file in Live Preview. Toggle between **Preview** and **Form** tabs.
- **Cook from a recipe** — click **Cook mode** in the rendered block. Opens [kaper.me](https://kaper.me?from=obsidian) for the full hands-free cooking experience.
- **Edit raw YAML** — switch to Source mode (top-right pane icon).

## Built on Obsidian's foundation

Obsidian's editor is built on [CodeMirror 6](https://codemirror.net/). This plugin extends CodeMirror directly — recipe blocks render as block widgets *inside* the editor itself, sharing the same rendering pipeline as headings, embeds, and Live Preview. There's no second UI layered on top of the editor, just one editor with rich content for kaper blocks.

Other open-source pieces that make this work:

- **[@dnd-kit/sortable](https://dndkit.com/)** — accessible drag-and-drop ingredient reordering (keyboard, touch, mouse).
- **[js-yaml](https://github.com/nodeca/js-yaml)** — YAML parsing and round-trip serialization for the kaper block content.

Credit to those projects' maintainers.

## Compatibility with the Kaper apps

Kaper recipe files are 100% portable. The same `.md` file works in:

- This Obsidian plugin
- The Kaper web app at [kaper.me](https://kaper.me)
- The Kaper desktop *coming soon

Your recipes never leave your filesystem. There's no sync layer — open the folder in any of the three and edits flow naturally through your normal sync setup (iCloud, Dropbox, Syncthing, git, whatever).

## Installation

### Community Plugins

_Pending submission to the Obsidian Community Plugin registry._

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
2. Copy them into `<your-vault>/.obsidian/plugins/kaper/`.
3. In Obsidian: Settings → Community plugins → enable **Kaper**.

### Development

```bash
git clone <this-repo>
cd obsidian-kaper
npm install
npm run dev    # watch mode → main.js
```

Symlink the repo into a test vault:

```bash
ln -s "$PWD" "/path/to/test-vault/.obsidian/plugins/kaper"
```

Run tests:

```bash
npm test
```

## License

MIT — see [LICENSE](LICENSE).

---

**Want the full Kaper experience?** Try [kaper.me](https://kaper.me) — no install, no signup. Open any folder of recipes and start cooking.
