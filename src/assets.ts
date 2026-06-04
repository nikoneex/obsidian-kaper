import { App, TFile } from 'obsidian';
import { ensureRecipeId } from './recipe-id';

/** URL-safe token making each image filename unique — 8 chars. */
function imageToken(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let token = '';
  for (let i = 0; i < 8; i++) token += alphabet[bytes[i] % alphabet.length];
  return token;
}

/**
 * Reads and writes step images under the Kaper root's `_assets/` folder,
 * matching how the Kaper web app stores recipe assets. `step.image` stores the
 * Kaper-root-relative path `_assets/{recipeId}--step-{token}.ext`; resolution
 * just re-anchors that onto the configured root.
 */
export class AssetIO {
  constructor(
    private readonly app: App,
    /** Joins a Kaper-root-relative path onto the configured root (vault-relative). */
    private readonly toVaultPath: (rootRelative: string) => string,
  ) {}

  /** Resolves a stored `step.image` to a displayable `app://` URL. */
  resolveUrl(image: string): string {
    return this.app.vault.adapter.getResourcePath(this.toVaultPath(image));
  }

  /**
   * Resolves any image reference for display in the preview. Absolute URLs and
   * `data:` URIs pass through untouched; a vault path or wikilink resolves
   * relative to `notePath` via Obsidian's link resolver; anything left over
   * falls back to the Kaper-root-relative `_assets/` convention that
   * app-managed step images are stored under.
   */
  resolveImage(image: string, notePath: string): string {
    if (!image) return image;
    if (/^(?:https?:|data:)/i.test(image)) return image;

    const linkpath = image.replace(/^\.\//, '');
    const file = this.app.metadataCache.getFirstLinkpathDest(linkpath, notePath);
    if (file) return this.app.vault.adapter.getResourcePath(file.path);

    return this.app.vault.adapter.getResourcePath(this.toVaultPath(linkpath));
  }

  /**
   * Writes a recipe image — a step photo (`step`) or the recipe's cover
   * (`cover`) — for the recipe at `filePath`, stamping the recipe's id first if
   * needed, and returns the Kaper-root-relative path to store in `step.image` or
   * `coverImage`. Returns null if the file can't be resolved. The `--step-` /
   * `--cover-` filename prefix mirrors the Kaper web app's asset contract.
   */
  async saveImage(
    filePath: string,
    file: File,
    kind: 'step' | 'cover' = 'step',
  ): Promise<string | null> {
    const tfile = this.app.vault.getAbstractFileByPath(filePath);
    if (!(tfile instanceof TFile)) return null;

    const recipeId = await ensureRecipeId(this.app, tfile);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const rootRelative = `_assets/${recipeId}--${kind}-${imageToken()}.${ext}`;

    await this.ensureFolder(this.toVaultPath('_assets'));
    const buffer = await file.arrayBuffer();
    await this.app.vault.createBinary(this.toVaultPath(rootRelative), buffer);
    return rootRelative;
  }

  private async ensureFolder(vaultPath: string): Promise<void> {
    if (this.app.vault.getAbstractFileByPath(vaultPath)) return;
    try {
      await this.app.vault.createFolder(vaultPath);
    } catch {
      /* already exists (race) — non-fatal */
    }
  }
}
