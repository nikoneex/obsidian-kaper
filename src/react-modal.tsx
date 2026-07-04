import { Modal } from 'obsidian';
import { ReactNode } from 'react';
import { Root, createRoot } from 'react-dom/client';

/**
 * Obsidian {@link Modal} that hosts a React tree in its content element, tying
 * the root's lifetime to the modal's open/close. Subclasses provide the modal
 * classes (e.g. the full-screen `kaper-sheet-modal`) and the tree to render;
 * this owns the createRoot/unmount contract so each modal doesn't re-implement
 * it.
 */
export abstract class ReactModal extends Modal {
  private root: Root | null = null;

  /** Classes added to the modal element — controls the modal's frame styling. */
  protected abstract modalClasses(): string[];

  /** The React tree to render into the modal's content element. */
  protected abstract renderContent(): ReactNode;

  onOpen(): void {
    this.modalEl.addClasses(this.modalClasses());
    this.root = createRoot(this.contentEl);
    this.root.render(this.renderContent());
  }

  onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}
