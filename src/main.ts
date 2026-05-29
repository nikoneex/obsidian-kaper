import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  normalizePath,
} from 'obsidian';
import { kaperEditorExtension } from './editor-extension';
import { FileLabelRewriter } from './file-label-rewriter';
import { ensureKaperId, hasKaperFrontmatter } from './frontmatter';
import { ensureRecipeId, readRecipeId } from './recipe-id';
import { serializeKaperYaml } from './parser/recipe-parser';
import { RecipeModel } from './parser/types';

const RIBBON_ICON = 'utensils-crossed';
const DEFAULT_BASE = 'Untitled';

export interface KaperSettings {
  /** Vault-relative folder Kaper treats as its library root. Empty = vault root. */
  kaperRootFolder: string;
}

const DEFAULT_SETTINGS: KaperSettings = {
  kaperRootFolder: '',
};

function emptyRecipe(title = 'Untitled'): RecipeModel {
  return {
    version: 1,
    title,
    servings: 2,
    ingredients: { main: [] },
    steps: [],
    capabilities: new Map(),
  };
}

function starterBlock(title?: string): string {
  const yaml = serializeKaperYaml(emptyRecipe(title));
  return `\`\`\`kaper\n${yaml}\`\`\`\n`;
}

function joinPath(folder: string, name: string): string {
  return normalizePath(folder === '/' ? name : `${folder}/${name}`);
}

export default class KaperPlugin extends Plugin {
  private labelRewriter: FileLabelRewriter | null = null;
  settings: KaperSettings = { ...DEFAULT_SETTINGS };

  async onload() {
    await this.loadSettings();

    this.registerEditorExtension([kaperEditorExtension]);

    this.labelRewriter = new FileLabelRewriter(this);
    this.app.workspace.onLayoutReady(() => this.labelRewriter?.start());

    this.addSettingTab(new KaperSettingTab(this.app, this));

    // Lazily migrate legacy `kaper: true` recipes to a stable id the first time
    // they are opened. New/already-stamped files are skipped — no bulk rewrite.
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        void this.migrateRecipeId(file);
      }),
    );

    this.addRibbonIcon(RIBBON_ICON, 'Create recipe', () => {
      void this.createRecipe();
    });

    this.addCommand({
      id: 'create-recipe',
      name: 'Create recipe',
      callback: () => {
        void this.createRecipe();
      },
    });

    this.addCommand({
      id: 'convert-to-recipe',
      name: 'Convert current note to recipe',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return false;
        if (!checking) {
          void this.convertToRecipe(file);
        }
        return true;
      },
    });
  }

  onunload() {
    this.labelRewriter?.stop();
    this.labelRewriter = null;
  }

  async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** Vault-relative Kaper root (`''` = vault root). Normalized, no trailing slash. */
  kaperRoot(): string {
    const raw = (this.settings.kaperRootFolder ?? '').trim();
    if (!raw || raw === '/') return '';
    return normalizePath(raw).replace(/\/+$/, '');
  }

  /**
   * Joins a Kaper-root-relative path onto the configured root, returning a
   * vault-relative path safe for the Vault/adapter APIs. When the root is the
   * vault root (`''`), returns the relative path as-is — never a leading-slash
   * path like `/_assets/...`, which Obsidian treats as invalid.
   */
  kaperPath(relative: string): string {
    const root = this.kaperRoot();
    return normalizePath(root ? `${root}/${relative}` : relative);
  }

  private async migrateRecipeId(file: TFile | null): Promise<void> {
    if (!file || file.extension !== 'md') return;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    // Only touch kaper recipes that lack a stable id; skip everything else.
    if (!fm || !('kaper' in fm)) return;
    if (readRecipeId(this.app, file)) return;
    await ensureRecipeId(this.app, file);
  }

  private async createRecipe(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    const folder: TFolder = activeFile?.parent ?? this.app.vault.getRoot();

    const fileName = this.uniqueFileName(folder.path, DEFAULT_BASE);
    const path = joinPath(folder.path, fileName);

    const initialContent = ensureKaperId(starterBlock());

    const file = await this.app.vault.create(path, initialContent);
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
  }

  private async convertToRecipe(file: TFile): Promise<void> {
    const added = { frontmatter: false, block: false };

    await this.app.vault.process(file, (data) => {
      let updated = data;
      if (!hasKaperFrontmatter(updated)) {
        updated = ensureKaperId(updated);
        added.frontmatter = true;
      }
      if (!updated.includes('```kaper')) {
        const trailing = updated.endsWith('\n') ? '' : '\n';
        updated = `${updated}${trailing}\n${starterBlock(file.basename)}`;
        added.block = true;
      }
      return updated;
    });

    if (!added.frontmatter && !added.block) {
      new Notice('Already a recipe.');
      return;
    }
    new Notice(
      `Converted to recipe${added.block ? ' (starter block added)' : ''}.`,
    );
  }

  private uniqueFileName(folderPath: string, base: string): string {
    const exists = (name: string) =>
      this.app.vault.getAbstractFileByPath(joinPath(folderPath, name)) !== null;

    let candidate = `${base}.md`;
    let i = 2;
    while (exists(candidate)) {
      candidate = `${base} ${i}.md`;
      i++;
    }
    return candidate;
  }
}

class KaperSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: KaperPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Kaper vault root folder')
      .setDesc(
        'Folder (relative to this vault) that Kaper web/desktop opens as its ' +
          'library. Leave empty to use the vault root. Step images are stored in ' +
          '_assets/ under this folder — it must match the folder you open in Kaper.',
      )
      .addText((text) =>
        text
          .setPlaceholder('e.g. Recipes (empty = vault root)')
          .setValue(this.plugin.settings.kaperRootFolder)
          .onChange(async (value) => {
            this.plugin.settings.kaperRootFolder = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
