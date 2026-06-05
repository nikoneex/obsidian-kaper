const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
// Matches any non-empty `kaper:` value — covers legacy `kaper: true` and the
// stamped `kaper: r_<nanoid>` shape.
const KAPER_VALUE_REGEX = /^[ \t]*kaper[ \t]*:[ \t]*\S+/m;
// The `kaper:` line within a frontmatter body, capturing up to its value so the
// value can be rewritten. `[ \t]` (not `\s`) keeps the match on a single line.
const KAPER_LINE_REGEX = /^([ \t]*kaper[ \t]*:[ \t]*).*$/m;

export function hasKaperFrontmatter(content: string): boolean {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return false;
  return KAPER_VALUE_REGEX.test(match[1]);
}

/** URL-safe id, `r_` + 10 chars (~60 bits). Matches the Kaper web app's id scheme. */
export function generateKaperId(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let id = 'r_';
  for (let i = 0; i < 10; i++) id += alphabet[bytes[i] & 63];
  return id;
}

/**
 * Returns the stable recipe id (`r_<nanoid>`) from the frontmatter, or null for
 * legacy `kaper: true`, a missing marker, or unparseable frontmatter.
 */
export function extractKaperId(content: string): string | null {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return null;
  const value = match[1].match(/^[ \t]*kaper[ \t]*:[ \t]*(\S+)/m)?.[1];
  return value && value.startsWith('r_') ? value : null;
}

/**
 * Ensures the content carries a stable `kaper: r_<id>` marker. Idempotent: an
 * existing id is preserved; legacy `kaper: true` (or any non-id value) is
 * upgraded to a fresh id; a missing marker or missing frontmatter is created.
 * This is how Obsidian-first recipes get an id and how `kaper: true` files
 * migrate.
 */
export function ensureKaperId(content: string): string {
  if (extractKaperId(content)) return content;

  const id = generateKaperId();
  const match = content.match(FRONTMATTER_REGEX);

  // No frontmatter block at all — prepend one.
  if (!match) {
    return `---\nkaper: ${id}\n---\n\n${content}`;
  }

  // Frontmatter has a `kaper:` line (legacy `true` / empty) — rewrite its value.
  if (KAPER_LINE_REGEX.test(match[1])) {
    const updatedBlock = match[0].replace(KAPER_LINE_REGEX, `$1${id}`);
    return content.replace(match[0], updatedBlock);
  }

  // Frontmatter without a `kaper:` line — insert one after the opening fence.
  const updatedBlock = match[0].replace(/^---\r?\n/, `---\nkaper: ${id}\n`);
  return content.replace(match[0], updatedBlock);
}
