import { App, TFile } from 'obsidian';
import { generateKaperId } from './frontmatter';

/**
 * Ensures a recipe file carries a stable `kaper: r_<id>`, stamping a fresh one
 * (or upgrading legacy `kaper: true`) via the frontmatter API. Returns the
 * resolved id. Idempotent — an existing id is read back, not replaced.
 *
 * This is the single point that guarantees an id when one is needed (image
 * upload) and the migration primitive for legacy `kaper: true` files (KPR-21).
 * Uses `processFrontMatter` rather than string surgery so it stays safe against
 * the live CodeMirror document.
 */
export async function ensureRecipeId(app: App, file: TFile): Promise<string> {
  let resolved = '';
  await app.fileManager.processFrontMatter(file, (fm) => {
    const existing = fm.kaper;
    if (typeof existing === 'string' && existing.startsWith('r_')) {
      resolved = existing;
    } else {
      resolved = generateKaperId();
      fm.kaper = resolved;
    }
  });
  return resolved;
}

/** Reads the stable id from the metadata cache without writing. Null if absent. */
export function readRecipeId(app: App, file: TFile): string | null {
  const value = app.metadataCache.getFileCache(file)?.frontmatter?.kaper;
  return typeof value === 'string' && value.startsWith('r_') ? value : null;
}
