import { EditorState, Extension, Prec, RangeSetBuilder, StateField, Text } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { editorInfoField, editorLivePreviewField } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { App as KaperApp } from './ui/App';
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
  constructor(private readonly info: BlockInfo) {
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
    // CodeMirror requires `toDOM()` to return a detached element — it inserts
    // the widget itself. Obsidian's `createDiv`/`Node.createDiv` helpers all
    // *append* the new element to their receiver, so on a Document they throw
    // HierarchyRequestError (only one root element allowed). We need plain
    // `createElement` here; the lint warning to prefer `createDiv` doesn't
    // apply to widget DOM construction.
    const container = view.dom.ownerDocument.createElement('div');
    container.className = 'kaper-block';
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

    const resolveImage = (path: string): string => {
      if (!path) return path;
      if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;

      const fileInfo = view.state.field(editorInfoField, false);
      const app = fileInfo?.app;
      if (!app) return path;

      const file = app.metadataCache.getFirstLinkpathDest(path, this.info.filePath);
      if (file) {
        return app.vault.adapter.getResourcePath(file.path);
      }
      return path;
    };

    root.render(
      <KaperApp
        filePath={this.info.filePath}
        recipe={parsed.recipe}
        parseError={parsed.parseError}
        resolveImage={resolveImage}
        mode="form"
        onChange={(recipe) => this.handleEdit(recipe, view)}
        onCookMode={() =>
          window.open('https://kaper.me?from=obsidian', '_blank', 'noopener,noreferrer')
        }
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

function buildDecorations(state: EditorState): DecorationSet {
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
        widget: new KaperWidget({ ...range, source, filePath }),
        block: true,
      }),
    );
  }
  return builder.finish();
}

const kaperField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(decorations, tr) {
    const wasLivePreview = tr.startState.field(editorLivePreviewField, false);
    const isLivePreview = tr.state.field(editorLivePreviewField, false);
    if (tr.docChanged || wasLivePreview !== isLivePreview) {
      return buildDecorations(tr.state);
    }
    return decorations.map(tr.changes);
  },
  provide(field) {
    return EditorView.decorations.from(field);
  },
});

export const kaperEditorExtension: Extension = Prec.highest(kaperField);
