# Kaper for Obsidian

*Recipes that live in your vault.*

<p align="center"><img src="assets/preview.png" alt="Kaper recipe preview" width="500"></p>

*[Kaper](https://kaper.me) is a local-first recipe manager — plain markdown files, no cloud, no account. This plugin brings it into your Obsidian vault.*

A markdown file with a ` ```kaper ` block becomes a structured recipe — preview, form editor, drag-to-reorder ingredients, the lot — rendered inline with the rest of your prose. No external app, no extra database, no second source of truth. Just one more thing your vault knows how to do.

## Why bother

You already chose Obsidian because your notes belong on your disk. Recipes deserve the same treatment. Kaper turns plain `.md` files into a real recipe manager:

- **Lives in your vault.** A recipe is a markdown file with `kaper: true` in frontmatter and a YAML block in the body. That's it. Anything outside the block is normal markdown — notes, intros, links, photos.
- **Renders inline in Live Preview.** No separate panel, no modal. The kaper block becomes a rendered recipe right where it sits. Switch to Source mode to see the raw YAML any time.
- **Form editor for the YAML-shy.** Title, servings, prep/cook time, tags, ingredient groups (drag to reorder), steps with notes, tips, warnings, durations. Auto-saves on every change.
- **Themed by Obsidian.** Uses your accent color and surface palette. Looks at home in any theme you've installed.

## Cook Mode at kaper.me

When it's time to actually cook, click **Cook mode** in any rendered Kaper block. You'll land in [kaper.me](https://kaper.me?from=obsidian) with that recipe loaded in big-text, hands-free, gesture-friendly view. No copy-paste. No app switch. Just the recipe ready to follow at the stove.

<p align="center"><img src="assets/demo.gif" alt="Editing a recipe" width="500"></p>

## File format

A Kaper recipe is two markers — frontmatter `kaper: true` and a fenced ` ```kaper ` YAML block. Anything else in the file is regular markdown.

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
version: 1
```

Tips and notes go here as regular markdown.
````

Required keys: `title`, `servings`, `ingredients`, `steps`. Everything else is optional.

<p align="center"><img src="assets/form.png" alt="Form editor" width="500"></p>

## Use it

- **New recipe** — click the utensils icon in the left ribbon, or run **Kaper: Create recipe** from the command palette.
- **Convert a note** — run **Kaper: Convert current note to Kaper recipe** to add the frontmatter and starter block to any open `.md` file.
- **Edit** — open any kaper file in Live Preview. Toggle **Preview** and **Form** at the top of the rendered block.
- **Cook** — click **Cook mode** to launch [kaper.me](https://kaper.me?from=obsidian).
- **Raw YAML** — switch to Source mode (top-right pane icon).

## Works with the rest of Kaper

Kaper recipe files are 100% portable. The same `.md` file works in:

- This Obsidian plugin
- The Kaper web app at [kaper.me](https://kaper.me)
- The Kaper desktop app (coming soon)

There's no sync layer to set up. Your files move through whatever you already use — iCloud, Dropbox, Syncthing, git, USB stick. Open the same folder anywhere.

## Privacy

This plugin makes no network requests. The only outbound link is the **Cook Mode** button, which opens `kaper.me?from=obsidian` in your browser — and even that only carries the URL parameter telling the web app where you arrived from. Your recipe files never leave your vault.

There is no Kaper server. We literally cannot read your files.

## Installation

### Community Plugins

*Pending submission to the Obsidian Community Plugin registry.*

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
2. Drop them into your vault's `.obsidian/plugins/kaper/` folder.
3. Settings → Community plugins → enable **Kaper**.

## Built on

Obsidian's editor is built on [CodeMirror 6](https://codemirror.net/). This plugin extends CodeMirror directly — recipe blocks render as block widgets *inside* the editor itself, sharing the same rendering pipeline as headings, embeds, and Live Preview. There's no second UI on top of the editor, just one editor that knows how to render kaper blocks.

Open-source pieces under the hood:

- **[@dnd-kit/sortable](https://dndkit.com/)** — accessible drag-and-drop for ingredient reordering (keyboard, touch, mouse).
- **[js-yaml](https://github.com/nodeca/js-yaml)** — YAML parsing and round-trip serialization.

## Development

```bash
git clone https://github.com/nikoneex/obsidian-kaper.git
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

**Want the full Kaper experience?** Open any folder of recipes at [kaper.me](https://kaper.me). No install. No signup.
