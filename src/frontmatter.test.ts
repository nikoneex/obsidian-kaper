import { describe, it, expect } from 'vitest';
import { ensureKaperFrontmatter, hasKaperFrontmatter } from './frontmatter';

describe('hasKaperFrontmatter', () => {
  it('returns true for files with kaper: true frontmatter', () => {
    expect(hasKaperFrontmatter('---\nkaper: true\n---\n\nbody')).toBe(true);
  });

  it('returns true for stamped kaper: r_<id> frontmatter', () => {
    expect(hasKaperFrontmatter('---\nkaper: r_AbCdEfGhIj\n---\n\nbody')).toBe(true);
  });

  it('returns true regardless of order within frontmatter', () => {
    expect(hasKaperFrontmatter('---\ntags: [recipe]\nkaper: true\n---\n\nbody')).toBe(true);
    expect(hasKaperFrontmatter('---\ntags: [recipe]\nkaper: r_xyz123\n---\n\nbody')).toBe(true);
  });

  it('returns false for files without frontmatter', () => {
    expect(hasKaperFrontmatter('# Just a markdown file')).toBe(false);
  });

  it('returns false for frontmatter without kaper key', () => {
    expect(hasKaperFrontmatter('---\ntags: [foo]\n---\n\nbody')).toBe(false);
  });

  it('returns false for kaper with empty value', () => {
    expect(hasKaperFrontmatter('---\nkaper:\n---\n\nbody')).toBe(false);
  });
});

describe('ensureKaperFrontmatter', () => {
  it('prepends frontmatter to a file without any', () => {
    const input = '```kaper\ntitle: x\n```';
    const result = ensureKaperFrontmatter(input);
    expect(result).toBe('---\nkaper: true\n---\n\n```kaper\ntitle: x\n```');
  });

  it('leaves files with kaper: true frontmatter alone', () => {
    const input = '---\nkaper: true\n---\n\n```kaper\ntitle: x\n```';
    expect(ensureKaperFrontmatter(input)).toBe(input);
  });

  it('preserves a stamped kaper: r_<id> value', () => {
    const input = '---\nkaper: r_AbCdEfGhIj\n---\n\n```kaper\ntitle: x\n```';
    expect(ensureKaperFrontmatter(input)).toBe(input);
  });

  it('adds kaper: true to existing frontmatter without it, preserving other keys', () => {
    const input = '---\ntags: [recipe]\naliases: [carbonara]\n---\n\nbody';
    const result = ensureKaperFrontmatter(input);
    expect(result.startsWith('---\nkaper: true\ntags: [recipe]\naliases: [carbonara]\n---\n')).toBe(true);
    expect(result).toContain('body');
  });

  it('is idempotent — running twice produces the same output', () => {
    const input = '---\ntags: [foo]\n---\n\nbody';
    const once = ensureKaperFrontmatter(input);
    const twice = ensureKaperFrontmatter(once);
    expect(twice).toBe(once);
  });

  it('preserves prose and code blocks below the frontmatter', () => {
    const input = 'A true Roman classic.\n\n```kaper\ntitle: Carbonara\n```\n\nNotes.';
    const result = ensureKaperFrontmatter(input);
    expect(result).toContain('A true Roman classic.');
    expect(result).toContain('```kaper');
    expect(result).toContain('Notes.');
  });
});
