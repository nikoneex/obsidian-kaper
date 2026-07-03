import { App, Modal, Notice, Platform } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { AssetIO } from './assets';
import { COOK_VIEW_TYPE } from './cook-view';
import { RecipeModel } from './parser/types';
import { hasSteps } from './recipe-model';
import { CookMode } from './ui/CookMode';

/**
 * Hosts the in-plugin Cook mode as a full-screen, bottom-sheet modal. The step
 * UI lives in the React {@link CookMode} component; this just owns the modal
 * shell and the React root's lifetime.
 */
class CookModeModal extends Modal {
  private root: Root | null = null;

  constructor(
    app: App,
    private readonly recipe: RecipeModel,
    private readonly assets: AssetIO,
    private readonly filePath: string,
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass('kaper-cook-modal');
    this.root = createRoot(this.contentEl);
    this.root.render(
      <CookMode
        recipe={this.recipe}
        assets={this.assets}
        filePath={this.filePath}
        onExit={() => this.close()}
        onBack={() => this.close()}
      />,
    );
  }

  onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}

/** Opens Cook mode beside the recipe, reusing an open panel if there is one. */
async function openCookView(app: App, filePath: string): Promise<void> {
  const { workspace } = app;
  const leaf =
    workspace.getLeavesOfType(COOK_VIEW_TYPE)[0] ?? workspace.getLeaf('split', 'vertical');
  await leaf.setViewState({ type: COOK_VIEW_TYPE, active: true, state: { filePath } });
}

/**
 * Opens Cook mode for a recipe, or explains why it can't. Desktop docks a side
 * panel beside the note; mobile (or a missing file path) falls back to the
 * full-screen sheet, which suits a phone and needs no vault path.
 */
export function openCookMode(
  app: App,
  recipe: RecipeModel | null,
  assets: AssetIO,
  filePath: string,
): void {
  if (!recipe || !hasSteps(recipe)) {
    new Notice('This recipe has no steps to cook through yet.');
    return;
  }
  if (Platform.isMobile || !filePath) {
    new CookModeModal(app, recipe, assets, filePath).open();
    return;
  }
  void openCookView(app, filePath);
}
