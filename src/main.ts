import { Notice, Plugin, TFile, TFolder } from 'obsidian';
import { clearPersistentRoots, registerKaperBlockProcessor } from './codeblock-processor';
import { FileLabelRewriter } from './file-label-rewriter';
import { ensureKaperFrontmatter, hasKaperFrontmatter } from './frontmatter';

const RIBBON_ICON = 'utensils-crossed';
const DEFAULT_BASE = 'Untitled';

const STARTER_BODY = `\`\`\`kaper
title: Untitled
servings: 1
ingredients:
  main: []
steps: []
version: 1
\`\`\`
`;

function joinPath(folder: string, name: string): string {
  return folder === '/' ? name : `${folder}/${name}`;
}

export default class KaperPlugin extends Plugin {
  private labelRewriter: FileLabelRewriter | null = null;

  async onload() {
    registerKaperBlockProcessor(this);

    this.labelRewriter = new FileLabelRewriter(this);
    this.app.workspace.onLayoutReady(() => this.labelRewriter?.start());

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
      name: 'Convert current note to Kaper recipe',
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
    clearPersistentRoots();
  }

  private async createRecipe(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    const folder: TFolder = activeFile?.parent ?? this.app.vault.getRoot();

    const fileName = await this.uniqueFileName(folder.path, DEFAULT_BASE);
    const path = joinPath(folder.path, fileName);

    const initialContent = ensureKaperFrontmatter(STARTER_BODY);

    const file = await this.app.vault.create(path, initialContent);
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
  }

  private async convertToRecipe(file: TFile): Promise<void> {
    const added = { frontmatter: false, block: false };

    await this.app.vault.process(file, (data) => {
      let updated = data;
      if (!hasKaperFrontmatter(updated)) {
        updated = ensureKaperFrontmatter(updated);
        added.frontmatter = true;
      }
      if (!updated.includes('```kaper')) {
        const trailing = updated.endsWith('\n') ? '' : '\n';
        updated = `${updated}${trailing}\n${STARTER_BODY.replace(
          'title: Untitled',
          `title: ${file.basename}`,
        )}`;
        added.block = true;
      }
      return updated;
    });

    if (!added.frontmatter && !added.block) {
      new Notice('Already a Kaper recipe.');
      return;
    }
    new Notice(
      `Converted to Kaper recipe${added.block ? ' (starter block added)' : ''}.`,
    );
  }

  private async uniqueFileName(folderPath: string, base: string): Promise<string> {
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
