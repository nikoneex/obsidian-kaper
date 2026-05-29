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
 * mirroring kaper web's AssetService contract (KPR-21). `step.image` stores the
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
   * Writes a step image for the recipe at `filePath`, stamping the recipe's id
   * first if needed, and returns the Kaper-root-relative path to store in
   * `step.image`. Returns null if the file can't be resolved.
   */
  async saveStepImage(filePath: string, file: File): Promise<string | null> {
    const tfile = this.app.vault.getAbstractFileByPath(filePath);
    if (!(tfile instanceof TFile)) return null;

    const recipeId = await ensureRecipeId(this.app, tfile);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const rootRelative = `_assets/${recipeId}--step-${imageToken()}.${ext}`;

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
