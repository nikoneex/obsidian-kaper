import { ItemView, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { AssetIO } from '../assets';
import { loadRecipeFromFile } from '../recipe-file';
import { hasSteps } from '../../recipe/model';
import { CookMode } from '../../ui/cook/CookMode';

export const COOK_VIEW_TYPE = 'kaper-cook-view';

interface CookViewState {
  filePath?: string;
}

/**
 * Desktop Cook mode: a dockable side-panel view that steps through a recipe
 * beside the note. It restores from the recipe's vault path (in its serializable
 * state), reloading the recipe from disk, so it survives Obsidian reloads and
 * always reflects the saved file. Mobile uses the full-screen modal instead.
 */
export class KaperCookView extends ItemView {
  private root: Root | null = null;
  private filePath = '';
  private title = 'Cooking...';
  /** Bumped per rendered recipe; see {@link renderRecipe}. */
  private session = 0;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly assets: AssetIO,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return COOK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.title;
  }

  getIcon(): string {
    return 'utensils-crossed';
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass('kaper-cook-view');
    this.root = createRoot(this.contentEl);
    await this.renderRecipe();
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    this.filePath = (state as CookViewState)?.filePath ?? '';
    await super.setState(state, result);
    await this.renderRecipe();
  }

  getState(): Record<string, unknown> {
    return { filePath: this.filePath };
  }

  private async renderRecipe(): Promise<void> {
    const root = this.root;
    if (!root) return;

    if (!this.filePath) {
      root.render(<div className="kaper-cook-view__empty">Open Cook mode from a recipe.</div>);
      return;
    }

    const { recipe, parseError } = await loadRecipeFromFile(this.app, this.filePath);
    if (!recipe || !hasSteps(recipe)) {
      root.render(
        <div className="kaper-cook-view__empty">
          {parseError ?? 'This recipe has no steps to cook through yet.'}
        </div>,
      );
      return;
    }

    this.title = recipe.title;
    // Obsidian reuses an open leaf for a same-type setViewState, so this can
    // re-render with a different recipe in place. Without a fresh key React
    // would keep the previous recipe's page, servings, and ticked ingredients;
    // keying each open makes it a clean session, as the mobile modal is.
    this.session += 1;
    root.render(
      <CookMode
        key={this.session}
        recipe={recipe}
        assets={this.assets}
        filePath={this.filePath}
        onExit={() => this.leaf.detach()}
      />,
    );
  }
}
