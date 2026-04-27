const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const KAPER_TRUE_REGEX = /^kaper\s*:\s*true\s*$/m;

export function hasKaperFrontmatter(content: string): boolean {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return false;
  return KAPER_TRUE_REGEX.test(match[1]);
}

export function ensureKaperFrontmatter(content: string): string {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    return `---\nkaper: true\n---\n\n${content}`;
  }

  if (KAPER_TRUE_REGEX.test(match[1])) {
    return content;
  }

  const updated = match[0].replace(/^---\r?\n/, '---\nkaper: true\n');
  return content.replace(match[0], updated);
}
