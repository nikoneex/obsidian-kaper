import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { parseKaperYaml } from './parser/recipe-parser';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const KAPER_VALUE_REGEX = /^\s*kaper\s*:\s*\S+/m;
const KAPER_BLOCK_REGEX = /```kaper\r?\n([\s\S]*?)```/;

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

  if (KAPER_VALUE_REGEX.test(match[1])) {
    return content;
  }

  const updated = match[0].replace(/^---\r?\n/, '---\nkaper: true\n');
  return content.replace(match[0], updated);
}
export function extractTagsFromKaperBlock(content: string): string[] {
  const match = content.match(KAPER_BLOCK_REGEX);
  if (!match) return [];

  const parsed = parseKaperYaml(match[1]);
  const explicitTags = parsed.recipe?.tags || [];

  const rawBlock = match[1];
  const inlineTags = new Set<string>();
  const regex = /(?:^|[^a-zA-Z0-9_/-])#([A-Za-z_/-][A-Za-z0-9_/-]*|[A-Za-z0-9_/-]*[A-Za-z_/-][A-Za-z0-9_/-]*)/g;
  let tagMatch;
  while ((tagMatch = regex.exec(rawBlock)) !== null) {
    inlineTags.add(tagMatch[1]);
  }

  const normalizeTag = (tag: string) => tag.trim().replace(/^#+/, '');
  const allTags = [...explicitTags, ...Array.from(inlineTags)].map(normalizeTag).filter(Boolean);
  
  return Array.from(new Set(allTags));
}

export function syncFileTags(content: string): string {
  const allTags = extractTagsFromKaperBlock(content);
  return syncFrontmatterTags(content, allTags);
}
export function syncFrontmatterTags(content: string, tags: string[] | undefined): string {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match || match.index === undefined) return content;

  let frontmatter = loadYaml(match[1]);
  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    frontmatter = {};
  }

  const normalizeTag = (tag: string) => tag.trim().replace(/^#+/, '');
  const normalizedRecipeTags = (tags ?? []).map(normalizeTag).filter(Boolean);
  const data = { ...(frontmatter as Record<string, unknown>) };
  const rawExistingTags = data.tags;
  const existingTags = Array.isArray(rawExistingTags)
    ? rawExistingTags.filter((tag): tag is string => typeof tag === 'string').map(normalizeTag)
    : typeof rawExistingTags === 'string'
      ? [normalizeTag(rawExistingTags)]
      : [];

  let needsUpdate = false;
  const existingSet = new Set(existingTags.map(t => t.toLowerCase()));
  for (const tag of normalizedRecipeTags) {
    if (!existingSet.has(tag.toLowerCase())) {
      needsUpdate = true;
      break;
    }
  }

  // If we don't need to add any new tags, and there were no tags to remove (we never remove existing tags), then no update is needed.
  if (!needsUpdate) {
    return content;
  }

  const mergedTags: string[] = [];
  const seen = new Set<string>();
  for (const tag of [...existingTags, ...normalizedRecipeTags]) {
    const normalized = tag.toLowerCase();
    if (!tag || seen.has(normalized)) continue;
    seen.add(normalized);
    mergedTags.push(tag);
  }

  if (mergedTags.length > 0) {
    data.tags = mergedTags;
  } else {
    delete data.tags;
  }

  const serialized = dumpYaml(data, { lineWidth: 100 }).trimEnd();
  const start = match.index;
  const end = start + match[0].length;
  return `${content.slice(0, start)}---\n${serialized}\n---\n${content.slice(end)}`;
}
