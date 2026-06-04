import { Notice } from 'obsidian';
import { AssetIO } from '../../assets';

/**
 * Reads the picked file from a file input and saves it via AssetIO, returning
 * the stored Kaper-root-relative path — or null if nothing was picked or the
 * write failed (a Notice is shown on failure). Always resets the input so the
 * same file can be re-picked after a remove. Shared by the cover-image and
 * step-image upload controls.
 */
export async function pickAndSaveImage(
  assets: AssetIO,
  filePath: string,
  input: HTMLInputElement,
  kind: 'step' | 'cover',
): Promise<string | null> {
  const file = input.files?.[0];
  input.value = ''; // let the same file be re-picked after a remove
  if (!file) return null;

  try {
    const saved = await assets.saveImage(filePath, file, kind);
    if (!saved) new Notice("Couldn't save the image — the recipe file isn't in the vault.");
    return saved;
  } catch (err) {
    console.error('Kaper: failed to save image', err);
    new Notice("Couldn't save the image. Check the console for details.");
    return null;
  }
}
