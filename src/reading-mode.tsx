import { MarkdownRenderChild, Plugin } from 'obsidian';
import { createRoot } from 'react-dom/client';
import { AssetIO } from './assets';
import { openCookMode } from './cook-mode';
import { parseKaperYaml } from './parser/recipe-parser';
import { ReadingPreview } from './ui/ReadingPreview';

/**
 * Renders ```kaper blocks in Reading mode as a read-only preview.
 *
 * The Live Preview editor extension handles the editing views; this covers the
 * separate Reading-mode render path, which CodeMirror extensions never see.
 * It does not fire in Source mode (nothing is rendered there), and in Live
 * Preview the editor extension's higher-precedence block replacement supersedes
 * it — so a recipe renders exactly once per mode. Obsidian renders the file's
 * frontmatter as Properties above the block on its own.
 */
export function registerKaperReadingMode(plugin: Plugin, assets: AssetIO): void {
  plugin.registerMarkdownCodeBlockProcessor('kaper', (source, el, ctx) => {
    const container = el.createDiv({ cls: 'kaper-block' });
    const root = createRoot(container);
    const parsed = parseKaperYaml(source);

    root.render(
      <ReadingPreview
        filePath={ctx.sourcePath}
        assets={assets}
        recipe={parsed.recipe}
        parseError={parsed.parseError}
        onStartCooking={() =>
          openCookMode(plugin.app, parsed.recipe, assets, ctx.sourcePath)
        }
      />,
    );

    // Tie the React root's lifetime to the rendered block so it unmounts when
    // Obsidian re-renders or tears down the preview.
    ctx.addChild(new ReactRenderChild(container, root));
  });
}

/** Class on the Reading-mode container that scopes the frontmatter-hide CSS. */
const RECIPE_DOC_CLASS = 'kaper-recipe-doc';
// Reading container to tag. Desktop exposes `.markdown-preview-view` (the nearer
// ancestor, so `closest` returns it there — desktop behavior is unchanged);
// mobile reading views may only expose `.markdown-reading-view`.
const HOST_SELECTOR = '.markdown-preview-view, .markdown-reading-view';
// Frames to keep retrying the host lookup while the section attaches (the
// rendered block can be detached when onload fires, notably on mobile). ~30
// frames ≈ half a second, then we give up rather than spin forever.
const MAX_TAG_ATTEMPTS = 30;

// Ref-count the marker class per container. A file can hold several recipe
// blocks that share one reading container, so the class must survive until the
// last block releases it — otherwise the first block to tear down un-hides the
// frontmatter for the others. The WeakMap lets detached containers be GC'd.
const hostRefCounts = new WeakMap<Element, number>();

function retainHost(host: Element): void {
  hostRefCounts.set(host, (hostRefCounts.get(host) ?? 0) + 1);
  host.addClass(RECIPE_DOC_CLASS);
}

function releaseHost(host: Element): void {
  const next = (hostRefCounts.get(host) ?? 1) - 1;
  if (next > 0) {
    hostRefCounts.set(host, next);
    return;
  }
  hostRefCounts.delete(host);
  host.removeClass(RECIPE_DOC_CLASS);
}

class ReactRenderChild extends MarkdownRenderChild {
  private host: Element | null = null;
  private raf = 0;
  private attempts = 0;

  constructor(
    containerEl: HTMLElement,
    private readonly root: ReturnType<typeof createRoot>,
  ) {
    super(containerEl);
  }

  onload(): void {
    this.tagHost();
  }

  onunload(): void {
    if (this.raf) window.cancelAnimationFrame(this.raf);
    this.raf = 0;
    // Release the ref taken in tagHost(); the class drops only when the last
    // recipe block sharing this container lets go.
    if (this.host) {
      releaseHost(this.host);
      this.host = null;
    }
    this.root.unmount();
  }

  /**
   * Tags the per-leaf Reading container so CSS can hide its Properties panel.
   * Scoped to Reading mode only — Live Preview keeps showing frontmatter. The
   * section can be detached when onload fires (closest() returns null), so retry
   * across a bounded number of frames until it attaches.
   */
  private tagHost(): void {
    const host: Element | null = this.containerEl.closest(HOST_SELECTOR);
    if (host) {
      this.host = host;
      retainHost(host);
      return;
    }
    if (this.attempts++ < MAX_TAG_ATTEMPTS) {
      this.raf = window.requestAnimationFrame(() => this.tagHost());
    }
  }
}
