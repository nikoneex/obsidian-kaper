import { App, TFile } from 'obsidian';
import { parseKaperYaml, serializeKaperYaml } from './parser/recipe-parser';
import { RecipeModel } from './parser/types';

const FENCE_OPEN = '```kaper';
const FENCE_CLOSE = '```';

/**
 * Returns the inner source of the first ```kaper block in `content`, or null if
 * there isn't one. Matches `iterKaperBlocks`' fence semantics (trimmed lines) so
 * the file and editor agree on what counts as a recipe block.
 */
export function extractKaperBlock(content: string): string | null {
  const lines = content.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (start < 0) {
      if (trimmed === FENCE_OPEN) start = i + 1;
    } else if (trimmed === FENCE_CLOSE) {
      return lines.slice(start, i).join('\n');
    }
  }
  return null;
}

/**
 * Returns `content` with the first ```kaper block's inner source replaced by
 * `newSource`, or null if there is no block. Fence detection matches
 * {@link extractKaperBlock} so read and write agree on block boundaries; the
 * fences themselves and everything around them are preserved verbatim.
 */
export function replaceKaperBlock(content: string, newSource: string): string | null {
  const lines = content.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (start < 0) {
      if (trimmed === FENCE_OPEN) start = i + 1;
    } else if (trimmed === FENCE_CLOSE) {
      // serializeKaperYaml ends with a newline; strip it so the close fence
      // doesn't gain a blank line above it on every save.
      const inner = newSource.replace(/\n$/, '');
      return [...lines.slice(0, start), inner, ...lines.slice(i)].join('\n');
    }
  }
  return null;
}

export interface LoadedRecipe {
  recipe: RecipeModel | null;
  parseError?: string;
}

/**
 * Reads a recipe file and parses its kaper block. Used by the desktop Cook mode
 * side panel, which restores from a vault path rather than a passed-in object so
 * it survives Obsidian reloads.
 */
export async function loadRecipeFromFile(app: App, filePath: string): Promise<LoadedRecipe> {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) return { recipe: null, parseError: 'Recipe file not found.' };

  const source = extractKaperBlock(await app.vault.cachedRead(file));
  if (source === null) return { recipe: null, parseError: 'No recipe block found in this file.' };

  return parseKaperYaml(source);
}

/**
 * Serializes `recipe` back into the file's kaper block. Used by the mobile form
 * modal, which edits outside the editor (the Live Preview widget writes through
 * the CodeMirror document instead). Uses `vault.process` for an atomic
 * read-modify-write. Returns false when the file or its block can't be found.
 */
export async function saveRecipeToFile(
  app: App,
  filePath: string,
  recipe: RecipeModel,
): Promise<boolean> {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) return false;

  const yaml = serializeKaperYaml(recipe);
  let replaced = false;
  await app.vault.process(file, (content) => {
    const next = replaceKaperBlock(content, yaml);
    if (next === null) return content;
    replaced = true;
    return next;
  });
  return replaced;
}
