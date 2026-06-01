import { Notice, Plugin, TAbstractFile, TFile, TFolder, normalizePath } from 'obsidian';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { App as KaperApp } from './ui/App';
import { kaperEditorExtension } from './editor-extension';
import { FileLabelRewriter } from './file-label-rewriter';
import { ensureKaperFrontmatter, hasKaperFrontmatter, extractTagsFromKaperBlock } from './frontmatter';
import { parseKaperYaml, serializeKaperYaml } from './parser/recipe-parser';
import { RecipeModel } from './parser/types';

const RIBBON_ICON = 'utensils-crossed';
const DEFAULT_BASE = 'Untitled';

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
  private syncTimeouts = new Map<string, NodeJS.Timeout>();

  onload() {
    this.registerEditorExtension([kaperEditorExtension]);

    this.registerMarkdownCodeBlockProcessor('kaper', (source, el, ctx) => {
      const parsed = parseKaperYaml(source);

      const resolveImage = (path: string): string => {
        if (!path) return path;
        if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;

        const file = this.app.metadataCache.getFirstLinkpathDest(path, ctx.sourcePath);
        if (file) {
          return this.app.vault.adapter.getResourcePath(file.path);
        }
        return path;
      };

      const root = createRoot(el);
      root.render(
        createElement(KaperApp, {
          filePath: ctx.sourcePath,
          recipe: parsed.recipe,
          parseError: parsed.parseError,
          resolveImage: resolveImage,
          mode: 'preview',
          onCookMode: () =>
            window.open('https://kaper.me?from=obsidian', '_blank', 'noopener,noreferrer')
        })
      );
    });

    this.labelRewriter = new FileLabelRewriter(this);
    this.app.workspace.onLayoutReady(() => this.labelRewriter?.start());

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === 'md') {
          void this.syncTagsForFile(file);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on('modify', (file: TAbstractFile) => {
        if (!(file instanceof TFile) || file.extension !== 'md') return;
        
        const existing = this.syncTimeouts.get(file.path);
        if (existing) clearTimeout(existing);

        this.syncTimeouts.set(
          file.path,
          setTimeout(async () => {
            this.syncTimeouts.delete(file.path);
            await this.syncTagsForFile(file);
          }, 2000)
        );
      })
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

  private async createRecipe(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    const folder: TFolder = activeFile?.parent ?? this.app.vault.getRoot();

    const fileName = this.uniqueFileName(folder.path, DEFAULT_BASE);
    const path = joinPath(folder.path, fileName);

    const initialContent = ensureKaperFrontmatter(starterBlock());

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

  private async syncTagsForFile(file: TFile) {
    try {
      const cache = this.app.metadataCache.getFileCache(file);
      const kaperValue = cache?.frontmatter?.kaper;
      if (kaperValue !== true && kaperValue !== 'true') {
        return;
      }

      const content = await this.app.vault.read(file);
      
      const kaperTags = extractTagsFromKaperBlock(content);
      
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        const currentTags = frontmatter.tags;
        const existingTags = Array.isArray(currentTags)
          ? currentTags.filter((t): t is string => typeof t === 'string')
          : typeof currentTags === 'string'
            ? [currentTags]
            : [];
        
        // Compare accurately by stripping '#' and lowering case
        const normalize = (t: string) => String(t).trim().toLowerCase().replace(/^#+/, '');
        
        const existingSet = new Set(existingTags.map(normalize));
        
        let needsUpdate = false;
        
        // Check if any kaper tags are missing from frontmatter
        for (const tag of kaperTags) {
          if (!existingSet.has(normalize(tag))) {
            needsUpdate = true;
            break;
          }
        }

        // If no update needed, return early
        if (!needsUpdate) return;
        
        const merged = new Set<string>();
        // Keep all existing tags (even manual ones)
        existingTags.forEach(t => merged.add(String(t).trim().replace(/^#+/, '')));
        // Add all kaper tags
        kaperTags.forEach(t => merged.add(t));
        
        if (merged.size > 0) {
          frontmatter.tags = Array.from(merged);
        }
      });
    } catch (err) {
      console.error('Failed to sync tags from Kaper block', err);
    }
  }
}
