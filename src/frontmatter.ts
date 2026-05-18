const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
// Matches any non-empty `kaper:` value — covers legacy `kaper: true` and the
// stamped `kaper: r_<nanoid>` shape used by kaper web post-KPR-13.
const KAPER_VALUE_REGEX = /^\s*kaper\s*:\s*\S+/m;

export function hasKaperFrontmatter(content: string): boolean {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return false;
  return KAPER_VALUE_REGEX.test(match[1]);
}

export function ensureKaperFrontmatter(content: string): string {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    return `---\nkaper: true\n---\n\n${content}`;
  }

  // Preserve any existing `kaper:` value (including a stamped id) — only add
  // when the marker is missing entirely.
  if (KAPER_VALUE_REGEX.test(match[1])) {
    return content;
  }

  const updated = match[0].replace(/^---\r?\n/, '---\nkaper: true\n');
  return content.replace(match[0], updated);
}
