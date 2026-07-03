# Obsidian Plugin Guidelines

Distilled from the official [Obsidian developer docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
(`obsidianmd/obsidian-developer-docs`, pulled 2026-07-03), organized around Kaper's
actual surfaces: recipe editing/reading (`editor-extension.tsx`, `reading-mode.tsx`,
`RecipePreview.tsx`), cook mode (`cook-mode.tsx`, `cook-view.tsx`, `ui/CookMode.tsx`),
the recipe form (`ui/recipe-form/`), and vault/frontmatter I/O (`recipe-file.ts`,
`frontmatter.ts`, `recipe-model.ts`).

This is the "what does Obsidian *want* a plugin to look/feel/behave like" reference.
Lint-enforced rules (unsafe `any`, `window.setTimeout`, no-placeholder-readme, etc.)
already live in [obsidian-review-warnings.md](obsidian-review-warnings.md) and
`eslint-plugin-obsidianmd` — this doc covers what the linter can't check: API choice,
lifecycle discipline, and native-feel UI conventions.

## Contents

1. [Plugin lifecycle](#1-plugin-lifecycle)
2. [Vault I/O](#2-vault-io)
3. [Events, intervals, and startup](#3-events-intervals-and-startup)
4. [Editor & Live Preview (CodeMirror 6)](#4-editor--live-preview-codemirror-6)
5. [Reading-mode rendering](#5-reading-mode-rendering)
6. [Commands](#6-commands)
7. [Views & workspace](#7-views--workspace)
8. [Modals](#8-modals)
9. [Settings](#9-settings)
10. [DOM, styling, icons](#10-dom-styling-icons)
11. [Ribbon, status bar, context menus](#11-ribbon-status-bar-context-menus)
12. [RTL and pop-out windows](#12-rtl-and-pop-out-windows)
13. [Mobile constraints](#13-mobile-constraints)
14. [React integration](#14-react-integration)
15. [Load-time performance](#15-load-time-performance)
16. [Secrets](#16-secrets)
17. [Releasing](#17-releasing)

---

## 1. Plugin lifecycle

Every plugin is a `Plugin` subclass with two hooks:

- **`onload()`** — registration only (commands, views, event listeners, settings tab).
  Never do expensive/async work here beyond registering things — see
  [§15](#15-load-time-performance).
- **`onunload()`** — release anything `onload` acquired that Obsidian doesn't
  auto-clean.

Prefer the `register*` family (`registerEvent`, `registerInterval`,
`registerEditorExtension`, `registerView`, `registerDomEvent`) over manual
setup/teardown pairs — they hook into the plugin's own unload so you don't have to
remember to reverse everything by hand. Anything **not** covered by a `register*`
helper (a mounted React root, a DOM node your own code appended) still needs
explicit cleanup in the owning `onClose`/`onunload`.

**Never reference the global `app`** (or `window.app`) — it's a debug-only escape
hatch that may be removed. Always use `this.app` from the plugin/view instance.

One hard exception to "clean everything up": **never detach workspace leaves in
`onunload`**. Obsidian reinitializes open leaves at their original position on
plugin update — detaching them on unload breaks that. Leaf cleanup belongs in the
code path that closes the leaf intentionally (e.g. a "close cook mode" action), not
in the plugin's own unload.

## 2. Vault I/O

Applies to `recipe-file.ts`, `frontmatter.ts`, `recipe-model.ts` — anywhere Kaper
reads or writes a `.kaper.md` file.

- **Prefer `Vault.process(file, data => newData)` over `read()` + `modify()`** for
  any edit to a file that isn't the actively-open editor. `process()` is atomic —
  it guarantees the content hasn't changed between read and write, avoiding
  clobbered edits when two writers touch the same recipe file. The callback must be
  **synchronous**; if the edit needs async work first (fetching an image, parsing),
  snapshot with `cachedRead()`, do the async work, then diff the `data` passed into
  `process()` against the snapshot and bail/retry if it drifted instead of
  silently overwriting.
- **Prefer the Editor API over `Vault.modify()`** for the file that's currently
  open in an editor — `modify()` discards cursor position, selection, and folded
  state; the Editor API doesn't.
- **`cachedRead()` vs `read()`**: use `cachedRead()` when only *displaying* content
  (recipe preview). Use `read()` (or `process()`) when you intend to read-then-write
  — don't base a write on a `cachedRead()` result.
- **Frontmatter edits go through `FileManager.processFrontMatter()`**, never manual
  YAML string manipulation. It's atomic and guarantees consistent YAML layout —
  directly relevant to every place Kaper reads/writes recipe frontmatter
  (ingredients, servings, tags).
- **`Vault.trash(file)` over `Vault.delete(file)`** for any user-initiated recipe
  deletion — `trash()` is recoverable, `delete()` is permanent.
- **Vault API over Adapter API** (`app.vault.adapter`) for anything in
  `.kaper.md` files. Vault caches and serializes file ops; Adapter is the
  low-level escape hatch for hidden dotfiles/folders the Vault API can't see.
- **Never iterate all files to find one** (`vault.getFiles().find(...)`). Use
  `Vault.getFileByPath()` / `getFolderByPath()` / `getAbstractFileByPath()`
  (discriminate the result with `instanceof TFile` / `TFolder`).
- **Run every constructed/user-derived vault path through `normalizePath()`**
  before using it — it collapses slashes, strips leading/trailing slashes, and
  normalizes Unicode.

## 3. Events, intervals, and startup

- **Always wrap subscriptions in `this.registerEvent(...)`**:
  `this.registerEvent(this.app.vault.on('modify', handler))`. A bare `.on()` call
  with no `registerEvent` leaks the listener across plugin reload/disable —
  duplicate handlers, stale closures, memory growth.
- **Same for timers**: `this.registerInterval(window.setInterval(fn, ms))`, never a
  bare `setInterval` left uncleared.
- **`create` fires once per file in the vault at startup.** A naive
  `vault.on('create', ...)` handler will process the user's entire existing vault
  as if every file were new. Fix by deferring *registration* itself past startup:
  ```ts
  onload() {
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on('create', this.onCreate, this));
    });
  }
  ```
  This is architecturally cleaner than guarding inside the handler with
  `workspace.layoutReady` — the handler simply isn't registered until the init
  flood has passed.
- Obsidian bundles Moment — `import { moment } from 'obsidian'` rather than adding
  it as a separate dependency.

## 4. Editor & Live Preview (CodeMirror 6)

Governs `editor-extension.tsx` and anything that changes how a `.kaper.md` file
looks/behaves while being actively edited (as opposed to Reading view — see
[§5](#5-reading-mode-rendering)).

**Decision rule up front**: if the goal is only to change Reading-view rendering,
don't build a CM6 extension — use a Markdown post processor. CM6 extensions are
for Live Preview only.

### `Editor` vs raw CM6

For simple text manipulation (insert/replace at cursor, read selection), use the
`Editor` abstraction (`editor.replaceRange`, `.replaceSelection`, `.getCursor`,
`.getSelection`) — it works across both of Obsidian's historical editor engines.
Only drop to the raw CM6 `EditorView` when you need CM6-specific capabilities
(decorations, state fields).

Getting the raw `EditorView` from a `MarkdownView` requires an Obsidian-sanctioned
type-escape (not a hack to avoid):
```ts
// @ts-expect-error, not typed
const editorView = view.editor.cm as EditorView;
```
Use `@ts-expect-error`, not `@ts-ignore` — it re-errors if the types ever become
accurate, catching drift.

### View plugins vs state fields

Both are registered via `this.registerEditorExtension([...])` in `onload()` (the
extension array itself is auto-cleaned on unload, but anything the extension
allocates internally — timers, listeners — needs its own `destroy()` logic).

| | View plugin | State field |
|---|---|---|
| Sees | Only the **viewport** (`view.visibleRanges`) | The whole document |
| Can restructure content (line breaks, blocks) | **No** — runs after viewport is computed | Yes |
| Performance | Better — prefer this whenever it's sufficient | Use only when required |
| Rebuild trigger | Gate on `update.docChanged \|\| update.viewportChanged` inside `update()` — don't rebuild unconditionally on every update | Reacts to dispatched `StateEffect`s |

Use a **view plugin** for anything that only depends on what's currently visible
(e.g. highlighting the ingredient line under the cursor). Use a **state field**
for anything that must stay correct outside the viewport, or that changes
viewport-affecting structure (inserting block-level callouts/line breaks).

**State fields don't store state, they manage it** — `update(oldState, transaction)`
is a pure reducer applying `transaction.effects`, not a mutable value you assign
into. Dispatch changes via `view.dispatch({ effects: [myEffect.of(payload)] })`,
never by mutating the field directly. Batch multi-step edits into **one**
`dispatch()` call with multiple `changes`/`effects` — dispatching sequentially
fragments the user's undo history (two `dispatch()` calls = two undo steps for
what should be one logical edit).

Communicating from plugin code (a command, a ribbon action) into a live extension:
- View plugin: `editorView.plugin(myViewPlugin)` → returns the instance or
  `undefined` — always null-check before calling a method on it.
- State field: dispatch an effect on the `EditorView`, same as above — don't call
  methods on the field.

### Decorations

Four kinds: `Decoration.mark` (style existing text), `Decoration.widget` (insert an
element), `Decoration.replace` (hide/replace a range), `Decoration.line` (style a
whole line). Widgets are a `WidgetType` subclass implementing `toDOM(view)`.

Provide decorations to the editor via `EditorView.decorations.from(field)` (state
field) or a `decorations` entry in `ViewPlugin.fromClass(Cls, { decorations: v =>
v.decorations })` (view plugin) — **omitting the `PluginSpec.decorations` mapping
means populated decorations are silently never applied.**

Performance rule directly relevant to any ingredient/step decoration in Live
Preview: walk `view.visibleRanges` in a view plugin, not the full syntax tree on
every keystroke. The docs call out full-document walks on every transaction as the
explicit performance mistake to avoid.

## 5. Reading-mode rendering

Governs `reading-mode.tsx`, `ui/ReadingPreview.tsx`, `ui/RecipePreview.tsx` — how a
`.kaper.md` file renders once Markdown has already become HTML.

- **`registerMarkdownPostProcessor(processor)`** — runs *after* HTML rendering; use
  `element.findAll(selector)` to locate nodes to transform, then rebuild with
  `createEl`/`createSpan`/`replaceWith` (never raw string HTML — see
  [§10](#10-dom-styling-icons)). Fits transforming already-rendered generic
  Markdown (e.g. decorating plain-list ingredient lines).
- **`registerMarkdownCodeBlockProcessor(language, processor)`** — targeted at a
  specific fenced code-block language; receives the raw `source` text directly and
  owns producing the entire rendered output for that block. If Kaper's recipe body
  lives inside a fenced block, this is the natural fit — it hands you structured
  source instead of requiring you to reverse-engineer already-rendered HTML.
- Post processors and CM6 editor extensions are **two independent rendering
  pipelines** — a post processor has zero effect on Live Preview, and a view
  plugin/state field has zero effect on Reading view. Equivalent visuals in both
  modes require separate registration (share the underlying rendering logic, but
  register it twice).

## 6. Commands

Every user-invokable action gets `this.addCommand()` in `onload()`, even if it's
also reachable via ribbon/menu — commands are what make an action discoverable via
the Command Palette and bindable to a hotkey.

- Match callback type to applicability: `callback` (always valid), `checkCallback`
  (conditional — e.g. "Start cook mode" should only surface when the active file
  is a `.kaper.md` note; re-derive the condition on both the `checking: true` and
  `checking: false` invocations, don't cache it), `editorCallback` /
  `editorCheckCallback` (needs the active `Editor`/`MarkdownView` — these already
  gate on an editor being active, don't hand-roll that check).
- **Don't ship a default hotkey** for general-purpose commands — conflicts with
  other plugins/user config, and no single binding is portable across OSes. Let the
  user bind their own. If a default is ever justified (very plugin-specific
  action), use the `Mod` modifier abstraction (Ctrl on Win/Linux, Cmd on macOS)
  rather than a hardcoded key.
- Don't prefix command `id`s with the plugin id — Obsidian does that automatically.

## 7. Views & workspace

Governs `cook-view.tsx` and any `ItemView` subclass.

- Implement `getViewType()` (unique stable string — extract to an exported
  constant since it's referenced from registration, leaf lookup, and
  `setViewState`), `getDisplayText()`, `onOpen()` (build content into
  `this.contentEl`), `onClose()` (**must** tear down anything the view acquired —
  listeners, timers, a mounted React root).
- Register once in `onload()`: `this.registerView(VIEW_TYPE_X, leaf => new
  XView(leaf))` — the second argument is a **factory**, not a persistent
  reference.
- **Never cache a view instance on the plugin class** (`this.view = new
  XView(...)` inside the factory). Obsidian may invoke the factory more than once;
  don't assume a 1:1 relationship. Look up a live instance on demand instead:
  ```ts
  const leaves = workspace.getLeavesOfType(VIEW_TYPE_X);
  const view = leaves.find(l => l.view instanceof XView)?.view;
  ```
- **Avoid side effects in the view constructor beyond what rendering needs** — it
  pairs with the point above: if the factory can run more than once, constructor
  side effects need to be idempotent or avoided entirely. This also matters for
  startup cost — see [Defer views](#deferred-views) below.
- **Avoid duplicate leaves** for singleton-style views (cook mode is exactly this
  — you don't want two cook-mode leaves open at once). Check
  `workspace.getLeavesOfType(VIEW_TYPE_X)` first; reuse an existing leaf if found,
  otherwise `getRightLeaf(false)` / `getLeaf(true)` + `leaf.setViewState({ type:
  VIEW_TYPE_X, active: true })`. Always follow with `workspace.revealLeaf(leaf)` so
  a leaf hidden in a collapsed sidebar actually becomes visible. This is the
  standard `activateView()` pattern and should be Kaper's template for opening
  cook mode.
- **Plugins own removing their own leaves.** `onunload` should call
  `leaf.detach()` (or `workspace.detachLeavesOfType(VIEW_TYPE_X)`) for any leaf the
  plugin created outside the "never detach in onunload" exception in
  [§1](#1-plugin-lifecycle) — that exception is specifically about *not*
  detaching on a normal disable/reload; a deliberate "close this view" action is a
  different code path.
- Avoid `workspace.activeLeaf` directly — use `getActiveViewOfType(MarkdownView)`
  or `workspace.activeEditor?.editor`.
- Use `workspace.iterateAllLeaves(cb)` for read-only enumeration rather than
  manually walking the split/tabs tree.

### Deferred views

Since Obsidian ≥ 1.7.2, every saved leaf loads at startup as a placeholder
`DeferredView` — the real view class (and its constructor) only runs once the
leaf's tab is actually selected. This is why cheap view constructors matter (see
[§15](#15-load-time-performance)).

**Never cast `leaf.view` without checking** — `as MyCustomView` is unsafe if the
leaf hasn't been revealed yet. Use `instanceof`:
```ts
if (leaf.view instanceof MyCustomView) { ... }
```
Rule of thumb: **if the plugin needs to talk to a view, reveal it first**:
```ts
const leaf = workspace.getLeavesOfType('my-view').first();
if (leaf) {
  await workspace.revealLeaf(leaf);
  if (leaf.view instanceof MyCustomView) { /* now it's real */ }
}
```
`leaf.loadIfDeferred()` (guard with `requireApiVersion('1.7.2')`) force-loads a
view without revealing it — an escape hatch for rare cases, not a normal pattern;
using it broadly reintroduces the startup cost deferred views exist to avoid.

## 8. Modals

Use `Modal` for anything blocking (import dialog, "discard unsaved recipe edits?"
confirmation) rather than a hand-rolled overlay `<div>`. Build form rows with
`Setting` against `this.contentEl` (same component as the settings tab), so modal
forms look consistent with the rest of Obsidian. Pass results out via a
constructor `onSubmit` callback, calling `this.close()` before invoking it.

For "pick one item" UI (recipe template picker, ingredient picker), use
`SuggestModal<T>` or `FuzzySuggestModal<T>` — don't build a custom
autocomplete/dropdown.

## 9. Settings

Applies to a future `PluginSettingTab` if Kaper adds one (currently no settings
tab in the repo, but these rules apply the moment one is added).

- Persist via `this.loadData()` / `this.saveData()`, merged with a
  `DEFAULT_SETTINGS` object: `Object.assign({}, DEFAULT_SETTINGS, await
  this.loadData())`.
- **Prefer the declarative `getSettingDefinitions()` API** (Obsidian ≥ 1.13.0)
  over the imperative `display()` override, unless `minAppVersion` must support
  pre-1.13. Keeping both (`display()` + `getSettingDefinitions()`) is a real
  ongoing cost — every future settings change has to be applied to both or
  versions drift.
  - Definitions are one of `control` (simple key-bound row, auto-saves, mutually
    exclusive with `render`/`action`), `render` (custom UI/side effects — must
    manually `saveData()` in `onChange`, doesn't auto-save), or `action`
    (clickable row).
  - **Never do I/O or heavy computation inside `getSettingDefinitions()`** — it
    runs on every tab update and once at registration for search indexing.
  - `validate` is a UI-only gate — it doesn't sanitize data already on disk from
    an older plugin version; re-validate in `loadSettings()` too.
  - Use `visible` (hide when irrelevant) vs `disabled` (show but lock) —
    they communicate different things, don't conflate them.
- **UI-text conventions, all explicit "don't do X, do Y" from Obsidian**:
  - Sentence case everywhere ("Template folder location", not "Template Folder
    Location").
  - No top-level heading repeating the plugin name/"Settings" — the sidebar tab
    title already names it.
  - Group headings only once there are 2+ sections; leave general settings
    unheaded at the top.
  - Don't repeat "settings" in a heading ("Advanced", not "Advanced settings").
  - Save on every change, not a submit button.
  - One control per row — never combine two inputs in one `Setting`; collect
    multi-field input in a `Modal` instead.
  - Avoid textareas in the main tab — push multi-line input into a modal.
  - Keep `desc` to one short sentence — no warnings/paragraphs; put those in a
    `Modal` with an explicit confirm step.

## 10. DOM, styling, icons

- **Never use `innerHTML`/`outerHTML`/`insertAdjacentHTML`** to build UI — both a
  security concern (a recipe title containing `<script>` is user-controlled
  input) and off-convention. Use `createEl()`/`createDiv()`/`createSpan()` (and
  `el.empty()` to clear).
- Style via `styles.css` classes (`cls` option), not inline `style` — so themes
  and snippets can target/override. **Use Obsidian's CSS variables** (e.g.
  `var(--background-modifier-border)`, `var(--text-muted)`) instead of hardcoded
  colors — this is explicitly what lets a plugin look correct under any theme.
- `element.toggleClass('some-class', condition)` for conditional styling instead
  of manual add/remove or inline style toggling.
- **Icons**: choose names from the Lucide set (lucide.dev), up to the version
  Obsidian currently bundles — don't reference icon names newer than what ships.
  Attach with `setIcon(el, 'icon-name')`, size via the `--icon-size` variable
  (e.g. `var(--icon-size-m)`), not hardcoded `width`/`height`. A fully custom icon
  is registered once via `addIcon('name', svg)` (must fit a `0 0 100 100`
  viewBox) and referenced like a built-in one; follow Lucide's own design spec
  (24×24 canvas, 2px stroke, round joins/caps) for visual consistency.

## 11. Ribbon, status bar, context menus

- `this.addRibbonIcon(iconName, tooltip, callback)` for a persistent sidebar
  action (e.g. "Open cook mode"). **Never assume the ribbon icon is available** —
  users can remove any plugin's ribbon icon or hide the ribbon entirely, so always
  provide the same action as a command too. Don't add a plugin-specific
  show/hide toggle for the ribbon icon — Obsidian already has one globally.
- `this.addStatusBarItem()` in `onload()`, populated via `createEl()`. **Not
  supported on mobile** — anything status-bar-only (a cook-mode timer/step
  indicator) needs an equivalent reachable elsewhere on mobile.
- `Menu` class for context/dropdown menus — `new Menu()`, `.addItem(item =>
  item.setTitle(...).setIcon(...).onClick(...))`, `.showAtMouseEvent(event)` for
  click-anchored menus. Set an icon on every item for visual consistency with
  native menus. To extend Obsidian's own file/editor context menu (rather than a
  standalone one), subscribe to the `file-menu`/`editor-menu` workspace events via
  `registerEvent` — e.g. adding "Open in cook mode" to the existing right-click
  menu on a recipe file, instead of a disconnected separate trigger.

## 12. RTL and pop-out windows

- Use CSS **logical properties** everywhere Kaper adds spacing/alignment
  (recipe form, ingredient list, cook mode): `margin-inline-start/end`,
  `padding-inline-start/end`, `border-inline-start/end`, `inset-inline-start/end`,
  `float: inline-start/end`, `text-align: start/end` — never the `-left`/`-right`
  physical equivalents. The global `.mod-rtl` class on `<body>` scopes any
  direction-specific overrides that logical properties can't express. Consider
  `unicode-bidi: plaintext` for single-line, direction-ambiguous text (recipe
  titles, ingredient names) — same treatment Obsidian's own file-name UI uses.
- **Pop-out windows** (desktop, ≥ 0.15.0) each get their own `Window`/`Document`
  and fresh global constructors — `instanceof HTMLElement`/`MouseEvent` checks
  against the *main* window's constructors silently fail for elements/events from
  a popped-out one. Any DOM Kaper builds programmatically (cook mode, recipe
  preview, ingredient lists) should:
  - Append relative to an existing element's own `.win`/`.doc`, not bare
    `document`/`window`/`activeDocument` — `someElement.doc.body.appendChild(...)`,
    not `activeDocument.body.appendChild(...)` (the latter targets whichever
    window has focus, not necessarily where the element logically belongs).
  - Use `element.instanceOf(HTMLElement)` / `event.instanceOf(MouseEvent)` instead
    of native `instanceof` — realm-safe.
  - If any renderer holds a live handle to its creation window/context, use
    `HTMLElement.onWindowMigrated(callback)` to reinitialize when moved to a
    different window.

## 13. Mobile constraints

- Import `Platform` from `obsidian` and branch on `Platform.isIosApp` /
  `Platform.isAndroidApp` for platform-specific code paths.
- **No Node.js/Electron APIs on mobile** (`fs`, `path`, `child_process`, etc. are
  simply unavailable — calling into them crashes the plugin). Audit dependencies
  for hidden usage, not just direct imports. If unavoidable, set
  `isDesktopOnly: true` in `manifest.json`; otherwise prefer Web API equivalents
  (`SubtleCrypto` over Node `crypto`, `navigator.clipboard` over Electron
  clipboard).
- **Regex lookbehind** (`(?<=...)`, `(?<!...)`) only works on iOS ≥ 16.4 — relevant
  if the recipe parser (`src/parser/`) uses lookbehind; feature-detect or gate
  with `Platform` checks rather than assuming support.
- Test mobile behavior via `this.app.emulateMobile(true/false)` from DevTools, or
  remote-inspect a real device (`chrome://inspect/` for Android, Safari Web
  Inspector for iOS ≥ 16.4 on a connected Mac).

## 14. React integration

Kaper is already React-based, so this is the load-bearing convention for every
custom view/component:

- `npm install react react-dom` + dev-only `@types/react @types/react-dom`;
  `"jsx": "react-jsx"` in `tsconfig.json` compiler options.
- **Mounting is tied to view lifecycle, not component lifecycle** — mirror the
  plugin's own `onload`/`onunload` cleanup contract, scoped to the view:
  ```ts
  // onOpen()
  this.root = createRoot(this.contentEl);
  this.root.render(<StrictMode><ReactView /></StrictMode>);

  // onClose()
  this.root?.unmount();
  ```
  `this.root.unmount()` in `onClose()` is a **hard requirement**, not optional —
  skipping it leaks the React tree every time the view/leaf closes. Type `root`
  as `Root | null` since it doesn't exist until `onOpen()` runs.
- Pass Obsidian's `App` instance down via React Context rather than prop-drilling:
  a `createContext<App | undefined>(undefined)`, a `<AppContext.Provider
  value={this.app}>` at the mount site, and a `useApp()` hook wrapping
  `useContext`. Components then call `useApp()` to reach `app.vault` etc.

## 15. Load-time performance

Obsidian loads **all** plugins fully before the user can interact with the app —
a slow `onload` is a synchronous tax on every user's startup, every time.

- Measure via Settings → General → Advanced → the stopwatch icon (direct
  before/after startup-time comparison).
- Ship a minified **production** build as `main.js` — not a dev build.
- Keep `onload` limited to registration (commands, views, post-processors, event
  registration). Defer anything non-essential to
  `this.app.workspace.onLayoutReady(callback)` — runs after Obsidian's own load
  sequence finishes, so it never blocks startup. This is the same mechanism as
  the `create`-event flood fix in [§3](#3-events-intervals-and-startup).
- View **constructors run synchronously at startup** for every saved leaf, unless
  the view is a deferred view (see [§7](#7-views--workspace)) — an expensive
  `cook-view.tsx` constructor directly extends app launch time for every user who
  had it open last session.

### Bases views (if ever added)

If Kaper builds a custom [Bases](https://help.obsidian.md/bases) view over
recipes, `onDataUpdated()` must assume vault-wide scale — an unfiltered Base can
hand you one entry per file in the *entire* vault, potentially thousands. Reuse
DOM elements across updates rather than clearing and rebuilding the container
each time, and avoid rendering off-screen content.

## 16. Secrets

If Kaper ever needs an API key/token (e.g. a recipe-import service), **never**
store it directly in plugin settings/`data.json`, and never roll a manual
`localStorage.setItem('apiKey', ...)`. Use `SecretStorage`: the plugin's own
settings hold only the **name** of a registered secret, and
`Setting#addComponent(el => new SecretComponent(this.app, el))` renders the
picker UI. Resolve at use-time via `app.secretStorage.getSecret(name)` (always
null-check — the name may not resolve). This centralizes the actual secret value
outside any single plugin's plaintext config and avoids the user re-entering the
same credential per plugin.

## 17. Releasing

Covered operationally in [obsidian-review-warnings.md](obsidian-review-warnings.md);
process specifics not duplicated there:

- **Manifest**: `minAppVersion` should reflect the actual minimum version needed
  (use the latest stable build if unsure, not a guessed-low value).
  `isDesktopOnly: true` if any Node/Electron API is used (see
  [§13](#13-mobile-constraints)). Only include `fundingUrl` if the plugin
  actually accepts funding. Don't prefix command ids with the plugin id.
- **Description**: ≤ 250 characters, ends with a period, starts with an action
  statement ("Import recipes from...", not "This is a plugin that..."), no
  emoji, correct capitalization of proper nouns (Obsidian, Markdown, PDF).
- **Release process**: `manifest.json` version is SemVer (`x.y.z`, no `v`
  prefix); the GitHub release tag must match it exactly; attach `main.js`,
  `manifest.json`, `styles.css` as release assets. The community directory reads
  `manifest.json` from the **HEAD of the default branch** separately from the
  release-asset copy — both need to be correct and in sync.
- **Automate the build+release step** with a tag-triggered GitHub Actions
  workflow (`actions/checkout` → `setup-node` → `npm install && npm run build` →
  `gh release create --draft`). Requires repo Settings → Actions → General →
  Workflow permissions = "Read and write permissions". The workflow drafts the
  release; publishing it is still a deliberate manual step.
- **Beta-test before submitting** via the community **BRAT** plugin
  (`obsidian42-brat`) — installs directly from a GitHub repo/branch, no formal
  submission needed for testers.
