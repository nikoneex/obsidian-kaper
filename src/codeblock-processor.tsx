import {
  App,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  MarkdownView,
  Plugin,
  TFile,
  TAbstractFile,
} from 'obsidian';
import { StrictMode } from 'react';
import { Root, createRoot } from 'react-dom/client';
import { App as KaperApp } from './ui/App';
import { parseKaperYaml, serializeKaperYaml } from './parser/recipe-parser';
import { RecipeModel } from './parser/types';
import { ensureKaperFrontmatter } from './frontmatter';

const FENCE_OPEN = '```kaper';
const FENCE_CLOSE = '```';

interface PersistentRoot {
  container: HTMLElement;
  root: Root;
}

// Keyed by file path. Survives Obsidian re-renders so React state, focus, and
// scroll within the form persist across saves. Rename/delete eviction below.
// Known limitation: two ```kaper blocks in the same file share one root.
const persistentRoots = new Map<string, PersistentRoot>();

function getOrCreateRoot(key: string): PersistentRoot {
  let entry = persistentRoots.get(key);
  if (!entry) {
    const container = document.createElement('div');
    container.className = 'kaper-block-inner';
    const root = createRoot(container);
    entry = { container, root };
    persistentRoots.set(key, entry);
  }
  return entry;
}

function evictRoot(key: string): void {
  const entry = persistentRoots.get(key);
  if (entry) {
    entry.root.unmount();
    persistentRoots.delete(key);
  }
}

export function clearPersistentRoots(): void {
  persistentRoots.forEach(({ root }) => root.unmount());
  persistentRoots.clear();
}

class KaperBlock extends MarkdownRenderChild {
  private saveTimer: number | null = null;
  private unloaded = false;

  constructor(
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly ctx: MarkdownPostProcessorContext,
    private readonly app: App,
  ) {
    super(containerEl);
  }

  onload() {
    this.containerEl.addClass('kaper-block');
    const entry = getOrCreateRoot(this.ctx.sourcePath);
    this.containerEl.appendChild(entry.container);
    this.render(entry.root);
  }

  onunload() {
    this.unloaded = true;
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const entry = persistentRoots.get(this.ctx.sourcePath);
    entry?.container.remove();
  }

  private render(root: Root) {
    const parsed = parseKaperYaml(this.source);
    root.render(
      <StrictMode>
        <KaperApp
          filePath={this.ctx.sourcePath}
          recipe={parsed.recipe}
          parseError={parsed.parseError}
          onChange={(recipe) => this.scheduleSave(recipe)}
          onCookMode={() => window.open('https://kaper.me?from=obsidian', '_blank', 'noopener,noreferrer')}
        />
      </StrictMode>,
    );
  }

  private scheduleSave(recipe: RecipeModel) {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      void this.save(recipe);
    }, 1000);
  }

  private async save(recipe: RecipeModel) {
    if (this.unloaded) return;

    const file = this.app.vault.getAbstractFileByPath(this.ctx.sourcePath);
    if (!(file instanceof TFile)) return;

    const section = this.ctx.getSectionInfo(this.containerEl);
    if (!section) return;

    const newYaml = serializeKaperYaml(recipe);
    const view = this.findMarkdownView(file);
    const editor = view?.editor;
    const savedCursor = editor?.getCursor();
    const savedScrollInfo = editor?.getScrollInfo();
    const scrollEl = this.containerEl.closest(
      '.cm-scroller, .markdown-preview-view',
    ) as HTMLElement | null;
    const scrollTop = scrollEl?.scrollTop ?? 0;

    await this.app.vault.process(file, (data) => {
      const lines = data.split('\n');
      const openLine = lines[section.lineStart];
      const closeLine = lines[section.lineEnd];

      if (!openLine?.trim().startsWith(FENCE_OPEN) || closeLine?.trim() !== FENCE_CLOSE) {
        return data;
      }

      const before = lines.slice(0, section.lineStart + 1);
      const after = lines.slice(section.lineEnd);
      const yamlLines = newYaml.replace(/\n$/, '').split('\n');
      const merged = [...before, ...yamlLines, ...after].join('\n');
      return ensureKaperFrontmatter(merged);
    });

    const restore = () => {
      if (editor && savedCursor) editor.setCursor(savedCursor);
      if (editor && savedScrollInfo) {
        editor.scrollTo(savedScrollInfo.left, savedScrollInfo.top);
      } else if (scrollEl) {
        scrollEl.scrollTop = scrollTop;
      }
    };

    let frames = 0;
    const tick = () => {
      if (this.unloaded) return;
      restore();
      if (frames++ < 12) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  private findMarkdownView(file: TFile): MarkdownView | null {
    let found: MarkdownView | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (
        leaf.view instanceof MarkdownView &&
        leaf.view.file?.path === file.path
      ) {
        found = leaf.view;
      }
    });
    return found;
  }
}

export function registerKaperBlockProcessor(plugin: Plugin) {
  plugin.registerMarkdownCodeBlockProcessor('kaper', (source, el, ctx) => {
    ctx.addChild(new KaperBlock(el, source, ctx, plugin.app));
  });

  plugin.registerEvent(
    plugin.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
      const entry = persistentRoots.get(oldPath);
      if (entry) {
        persistentRoots.delete(oldPath);
        persistentRoots.set(file.path, entry);
      }
    }),
  );
  plugin.registerEvent(
    plugin.app.vault.on('delete', (file: TAbstractFile) => {
      evictRoot(file.path);
    }),
  );
}
