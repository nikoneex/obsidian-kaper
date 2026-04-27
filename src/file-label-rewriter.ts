import { Plugin } from 'obsidian';

const KAPER_SUFFIX = '.kaper';

const STATIC_SELECTORS = [
  '.nav-file-title[data-path$=".kaper.md"] .nav-file-title-content',
  '.workspace-tab-header-inner-title',
];

const RENAMEABLE_SELECTOR = '.view-header-title, .inline-title';

const RELEVANT_PARENT_SELECTOR =
  '.nav-files-container, .workspace-tabs, .view-header, .markdown-source-view, .markdown-preview-view';

export class FileLabelRewriter {
  private observer: MutationObserver | null = null;
  private rewriteScheduled = false;
  private readonly focusInHandler = (e: Event) => this.handleFocusIn(e);
  private readonly focusOutHandler = (e: Event) => this.handleFocusOut(e);

  constructor(private readonly plugin: Plugin) {}

  start(): void {
    this.scheduleRewrite();

    this.observer = new MutationObserver((records) => {
      if (this.recordsAffectLabels(records)) {
        this.scheduleRewrite();
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('focusin', this.focusInHandler);
    document.addEventListener('focusout', this.focusOutHandler);

    const { workspace, vault } = this.plugin.app;
    this.plugin.registerEvent(workspace.on('layout-change', () => this.scheduleRewrite()));
    this.plugin.registerEvent(workspace.on('file-open', () => this.scheduleRewrite()));
    this.plugin.registerEvent(vault.on('rename', () => this.scheduleRewrite()));
    this.plugin.registerEvent(vault.on('create', () => this.scheduleRewrite()));
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    document.removeEventListener('focusin', this.focusInHandler);
    document.removeEventListener('focusout', this.focusOutHandler);
  }

  private recordsAffectLabels(records: MutationRecord[]): boolean {
    for (const record of records) {
      const target = record.target;
      if (target instanceof Element && target.closest(RELEVANT_PARENT_SELECTOR)) {
        return true;
      }
    }
    return false;
  }

  private scheduleRewrite(): void {
    if (this.rewriteScheduled) return;
    this.rewriteScheduled = true;
    requestAnimationFrame(() => {
      this.rewriteScheduled = false;
      this.rewriteAll();
    });
  }

  private rewriteAll(): void {
    for (const selector of STATIC_SELECTORS) {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => this.stripStatic(el));
    }
    document
      .querySelectorAll<HTMLElement>(RENAMEABLE_SELECTOR)
      .forEach((el) => this.stripRenameable(el));
  }

  private stripStatic(el: HTMLElement): void {
    if (el.querySelector('input, textarea')) return;

    const navFileTitle = el.closest('.nav-file-title');
    if (navFileTitle?.classList.contains('is-being-renamed')) return;

    this.stripText(el);
  }

  private stripRenameable(el: HTMLElement): void {
    if (document.activeElement === el) return;
    this.stripText(el);
  }

  private stripText(el: HTMLElement): void {
    const current = el.textContent ?? '';
    if (!current.endsWith(KAPER_SUFFIX)) return;

    const cleaned = current.slice(0, -KAPER_SUFFIX.length);
    if (!cleaned) return;
    if (el.textContent === cleaned) return;
    el.textContent = cleaned;
  }

  private handleFocusIn(e: Event): void {
    const target = e.target as HTMLElement | null;
    if (!target?.matches?.(RENAMEABLE_SELECTOR)) return;

    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile?.path.endsWith('.kaper.md')) return;

    const realName = activeFile.basename;
    if (target.textContent === realName) return;

    target.textContent = realName;

    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private handleFocusOut(e: Event): void {
    const target = e.target as HTMLElement | null;
    if (!target?.matches?.(RENAMEABLE_SELECTOR)) return;
    setTimeout(() => this.scheduleRewrite(), 50);
  }
}
