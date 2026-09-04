import { EditorState, Extension, Prec, RangeSetBuilder, StateField, Text } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { App, editorInfoField, editorLivePreviewField } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { App as KaperApp } from './ui/App';
import { AssetIO } from './assets';
import { openCookMode } from './cook-mode';
import { parseKaperYaml, serializeKaperYaml } from './parser/recipe-parser';
import { RecipeModel } from './parser/types';

const FENCE_OPEN = '```kaper';
const FENCE_CLOSE = '```';
// Matches a leading frontmatter block containing any non-empty `kaper:` value —
// covers legacy `kaper: true` and the stamped `kaper: r_<nanoid>` shape.
const KAPER_FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?^kaper\s*:\s*\S+/m;

interface BlockRange {
  blockFrom: number;
  blockTo: number;
  contentFrom: number;
  contentTo: number;
}

interface BlockInfo extends BlockRange {
  source: string;
  filePath: string;
}

const widgetRoots = new WeakMap<HTMLElement, Root>();

function* iterKaperBlocks(doc: Text): Iterable<BlockRange> {
  let openLine = -1;
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text.trim();
    if (openLine < 0 && text === FENCE_OPEN) {
      openLine = i;
    } else if (openLine >= 0 && text === FENCE_CLOSE) {
      const openLineObj = doc.line(openLine);
      yield {
        blockFrom: openLineObj.from,
        blockTo: line.to,
        contentFrom: openLineObj.to + 1,
        contentTo: line.from,
      };
      openLine = -1;
    }
  }
}

function hasKaperFrontmatter(doc: Text): boolean {
  const head = doc.sliceString(0, Math.min(1024, doc.length));
  return KAPER_FRONTMATTER_REGEX.test(head);
}

class KaperWidget extends WidgetType {
  constructor(
    private readonly info: BlockInfo,
    private readonly assets: AssetIO,
    private readonly app: App,
  ) {
    super();
  }

  eq(other: KaperWidget): boolean {
    return (
      this.info.source === other.info.source &&
      this.info.filePath === other.info.filePath &&
      this.info.contentFrom === other.info.contentFrom &&
      this.info.contentTo === other.info.contentTo
    );
  }

  toDOM(view: EditorView): HTMLElement {
    // Obsidian's global `createDiv` returns a detached element — matches
    // CodeMirror's `toDOM()` contract (CM inserts the widget itself; Node
    // prototype's `createDiv` would append and can't be used here).
    const container = createDiv({ cls: 'kaper-block' });
    // Prevent focus on inputs inside the widget from bubbling to CM's contentDOM,
    // which otherwise treats it as "editor focused" and scrolls the doc cursor
    // (often near the closing fence) into view — manifesting as a jump to the
    // bottom of the form on first focus.
    container.addEventListener('focusin', (e) => e.stopPropagation());
    const root = createRoot(container);
    widgetRoots.set(container, root);
    this.render(root, view);
    return container;
  }

  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    const root = widgetRoots.get(dom);
    if (!root) return false;
    this.render(root, view);
    return true;
  }

  destroy(dom: HTMLElement): void {
    const root = widgetRoots.get(dom);
    if (root) {
      root.unmount();
      widgetRoots.delete(dom);
    }
  }

  private render(root: Root, view: EditorView) {
    const parsed = parseKaperYaml(this.info.source);
    root.render(
      <KaperApp
        filePath={this.info.filePath}
        assets={this.assets}
        recipe={parsed.recipe}
        parseError={parsed.parseError}
        onChange={(recipe) => this.handleEdit(recipe, view)}
        onCookMode={() => openCookMode(this.app, parsed.recipe, this.assets, this.info.filePath)}
      />,
    );
  }

  private handleEdit(recipe: RecipeModel, view: EditorView) {
    const newYaml = serializeKaperYaml(recipe);
    view.dispatch({
      changes: { from: this.info.contentFrom, to: this.info.contentTo, insert: newYaml },
      scrollIntoView: false,
    });
  }
}

function buildDecorations(state: EditorState, assets: AssetIO, app: App): DecorationSet {
  if (!state.field(editorLivePreviewField, false)) return Decoration.none;
  if (!hasKaperFrontmatter(state.doc)) return Decoration.none;

  const fileInfo = state.field(editorInfoField, false);
  const filePath = fileInfo?.file?.path ?? '';

  const builder = new RangeSetBuilder<Decoration>();
  for (const range of iterKaperBlocks(state.doc)) {
    const source = state.doc.sliceString(range.contentFrom, range.contentTo);
    builder.add(
      range.blockFrom,
      range.blockTo,
      Decoration.replace({
        widget: new KaperWidget({ ...range, source, filePath }, assets, app),
        block: true,
      }),
    );
  }
  return builder.finish();
}

export function kaperEditorExtension(app: App, assets: AssetIO): Extension {
  const kaperField = StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state, assets, app);
    },
    update(decorations, tr) {
      const wasLivePreview = tr.startState.field(editorLivePreviewField, false);
      const isLivePreview = tr.state.field(editorLivePreviewField, false);
      if (tr.docChanged || wasLivePreview !== isLivePreview) {
        return buildDecorations(tr.state, assets, app);
      }
      return decorations.map(tr.changes);
    },
    provide(field) {
      return EditorView.decorations.from(field);
    },
  });

  return Prec.highest(kaperField);
}
