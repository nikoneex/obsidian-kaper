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

  constructor(private readonly plugin: Plugin) {}

  start(): void {
    this.scheduleRewrite();

    const doc = activeDocument;

    this.observer = new MutationObserver((records) => {
      if (this.recordsAffectLabels(records)) {
        this.scheduleRewrite();
      }
    });
    this.observer.observe(doc.body, { childList: true, subtree: true });

    this.plugin.registerDomEvent(doc, 'focusin', (e) => this.handleFocusIn(e));
    this.plugin.registerDomEvent(doc, 'focusout', (e) => this.handleFocusOut(e));

    const { workspace, vault } = this.plugin.app;
    this.plugin.registerEvent(workspace.on('layout-change', () => this.scheduleRewrite()));
    this.plugin.registerEvent(workspace.on('file-open', () => this.scheduleRewrite()));
    this.plugin.registerEvent(vault.on('rename', () => this.scheduleRewrite()));
    this.plugin.registerEvent(vault.on('create', () => this.scheduleRewrite()));
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private recordsAffectLabels(records: MutationRecord[]): boolean {
    for (const record of records) {
      const target = record.target;
      if (!target.instanceOf(Element)) continue;
      // CodeMirror's typing churn lives in .cm-content; never affects labels.
      if (target.closest('.cm-content')) continue;
      if (target.closest(RELEVANT_PARENT_SELECTOR)) {
        return true;
      }
    }
    return false;
  }

  private scheduleRewrite(): void {
    if (this.rewriteScheduled) return;
    this.rewriteScheduled = true;
    window.requestAnimationFrame(() => {
      this.rewriteScheduled = false;
      this.rewriteAll();
    });
  }

  private rewriteAll(): void {
    for (const selector of STATIC_SELECTORS) {
      activeDocument.querySelectorAll<HTMLElement>(selector).forEach((el) => this.stripStatic(el));
    }
    activeDocument
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
    if (activeDocument.activeElement === el) return;
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

    const range = activeDocument.createRange();
    range.selectNodeContents(target);
    const selection = activeWindow.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private handleFocusOut(e: Event): void {
    const target = e.target as HTMLElement | null;
    if (!target?.matches?.(RENAMEABLE_SELECTOR)) return;
    window.setTimeout(() => this.scheduleRewrite(), 50);
  }
}
