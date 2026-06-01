# Kaper Plus recipe manager plugin for Obsidian

*Recipes that live in your vault.*

<p align="center"><img src="assets/preview.png" alt="Kaper recipe preview" width="500"></p>

*[Kaper Plus](https://kaper.me) is a local-first recipe manager — plain markdown files, no cloud, no account. This plugin brings it into your Obsidian vault.*

A markdown file with a ` ```kaper ` block becomes a structured recipe — preview, form editor, drag-to-reorder ingredients, the lot — rendered inline with the rest of your prose. No external app, no extra database, no second source of truth. Just one more thing your vault knows how to do.

## Key features

You already chose Obsidian because your notes belong on your disk. Recipes deserve the same treatment. Kaper Plus turns plain `.md` files into a real recipe manager:

- **Lives in your vault.** A recipe is a markdown file with `kaper: true` in frontmatter and a YAML block in the body. That's it. Anything outside the block is normal markdown — notes, intros, links, photos.
- **Renders a preview in Obsidian reading mode.** No separate panel, no modal. The kaper block becomes a rendered recipe right where it sits. Disable the Kaper plugin in settings to see the raw YAML any time.
- **Form editor for the YAML-shy.** Switch to Obsidian's editing mode to edit the data in a Form: title, servings, prep/cook time, tags, ingredient groups (drag to reorder), steps with notes, tips, warnings, durations. Auto-saves on every change.
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

## How to use it

- **New recipe** — click the utensils icon in the left ribbon, or run **Kaper: Create recipe** from the command palette.
- **Convert a note** — run **Kaper: Convert current note to Kaper recipe** to add the frontmatter and starter block to any open `.md` file.
- **Edit** — open any kaper file in Form view. Toggle (Cmd+E) to Obsidian's **Reading** mode to see a preview.
- **Cook** — click **Cook mode** to launch [kaper.me](https://kaper.me?from=obsidian).
- **Raw YAML** — disable the Kaper Plus plugin in settings to see the raw YAML.

## Use with Obsidian's Web Clipper extension to save a recipe

Create a new template in the Clipper options page and give it a name, e.g. Kaper Recipe. Make sure that you have setup an AI provider for this to work, e.g. Gemini 2.5 Pro.

### Define properties in frontmatter

Define the properties that you'd like to use for each recipe. Always incclude the `kaper: true` property.

#### Example:

![Kaper properties](<assets/Kaper properties.jpg>)

### Create a template

Add the template in the Note Content text area.

#### Example:

```
{{ "Extract the recipe information to a 'kaper' code block as per the following YAML schema. Omit any optional fields if unavailable.

YAML schema:

coverImage: url-or-path   # url or path to the cover image or main image at the top of the recipe (optional)
title: Recipe Name
servings: 4
difficulty: medium        # easy | medium | hard (optional)
tags:                     # optional
  - tag1
time:                     # optional
  prep: '15m'             # preparation time in minutes (m) or hours (h)
  cook: '30m'             # cooking time in minutes (m) or hours (h)
ingredients:
  group:                  # group name, e.g. pasta, sauce, dressing
    - amount: 200
      unit: g             # empty string '' if no unit
      name: ingredient name
      sub: fallback name  # optional
      optional: false     # optional, defaults to false
steps:
  - title: Clear, actionable step description.
    duration: '5m'        # optional
    tip: helpful hint     # optional
    warning: caution      # optional
    note: extra note      # optional
    image: url-or-path    # optional

Allowed top-level keys (use ONLY these): title, servings, difficulty, tags, time, source, ingredients, steps

Allowed step keys (use ONLY these): title, duration, tip, warning, note, image

Allowed time keys (use ONLY these): prep, cook

Rules:
- Every ingredient must have amount (number), unit (string), and name (string).
- Group ingredients by component (e.g. pasta, sauce, topping).
- Steps should be concise and actionable.
- difficulty must be one of: easy, medium, hard.
- Do NOT add any keys not listed above, even if the source recipe has them.
- Surround the YAML content with surrounding code fences, i.e. 3 back ticks and the word 'kaper' right after the first 3 back ticks.
- Output only the raw markdown content."}}
```

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
2. Drop them into your vault's `.obsidian/plugins/kaper-plus/` folder.
3. Settings → Community plugins → enable **Kaper Plus**.

## Built on

Obsidian's editor is built on [CodeMirror 6](https://codemirror.net/). This plugin extends CodeMirror directly — recipe blocks render as block widgets *inside* the editor itself, sharing the same rendering pipeline as headings and embeds. There's no second UI on top of the editor, just one editor that knows how to render kaper blocks.

Open-source pieces under the hood:

- **[@dnd-kit/sortable](https://dndkit.com/)** — accessible drag-and-drop for ingredient reordering (keyboard, touch, mouse).
- **[js-yaml](https://github.com/nodeca/js-yaml)** — YAML parsing and round-trip serialization.

## Development

```bash
git clone https://github.com/bluelephant825/kaper-plus.git
cd kaper-plus
npm install
npm run dev    # watch mode → main.js
```

Symlink the repo into a test vault:

```bash
ln -s "$PWD" "/path/to/test-vault/.obsidian/plugins/kaper-plus"
```

Run tests:

```bash
npm test
```

## License

MIT — see [LICENSE](LICENSE).

---

[**Kaper Plus**](https://github.com/bluelephant825/kaper-plus) is based on the Obsidian plugin [**Kaper**](https://github.com/nikoneex/obsidian-kaper) made by Niko. 

**Want the full Kaper experience?** Open any folder of recipes at [kaper.me](https://kaper.me). No install. No signup.
