import { describe, it, expect } from 'vitest';
import {
  ensureKaperId,
  extractKaperId,
  generateKaperId,
  hasKaperFrontmatter,
} from './frontmatter';

const ID_RE = /^r_[A-Za-z0-9_-]{10}$/;

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

describe('generateKaperId', () => {
  it('produces an r_-prefixed 10-char url-safe id', () => {
    expect(generateKaperId()).toMatch(ID_RE);
  });

  it('produces distinct ids', () => {
    expect(generateKaperId()).not.toBe(generateKaperId());
  });
});

describe('extractKaperId', () => {
  it('returns the id for stamped frontmatter', () => {
    expect(extractKaperId('---\nkaper: r_AbCdEfGhIj\n---\n\nbody')).toBe('r_AbCdEfGhIj');
  });

  it('returns null for legacy kaper: true', () => {
    expect(extractKaperId('---\nkaper: true\n---\n\nbody')).toBeNull();
  });

  it('returns null when there is no frontmatter or no kaper key', () => {
    expect(extractKaperId('# plain')).toBeNull();
    expect(extractKaperId('---\ntags: [x]\n---\n\nbody')).toBeNull();
  });

  it('finds the id regardless of key order', () => {
    expect(extractKaperId('---\ntags: [recipe]\nkaper: r_xyz1234567\n---\n')).toBe('r_xyz1234567');
  });
});

describe('ensureKaperId', () => {
  it('prepends frontmatter with an id to a file without any', () => {
    const result = ensureKaperId('```kaper\ntitle: x\n```');
    expect(extractKaperId(result)).toMatch(ID_RE);
    expect(result).toContain('```kaper\ntitle: x\n```');
  });

  it('upgrades legacy kaper: true to a stamped id', () => {
    const result = ensureKaperId('---\nkaper: true\n---\n\nbody');
    expect(extractKaperId(result)).toMatch(ID_RE);
    expect(result).not.toContain('kaper: true');
    expect(result).toContain('body');
  });

  it('stamps an id when the kaper value is empty', () => {
    const result = ensureKaperId('---\nkaper:\n---\n\nbody');
    expect(extractKaperId(result)).toMatch(ID_RE);
  });

  it('preserves an existing stamped id (idempotent)', () => {
    const input = '---\nkaper: r_AbCdEfGhIj\n---\n\n```kaper\ntitle: x\n```';
    expect(ensureKaperId(input)).toBe(input);
  });

  it('inserts a kaper id into existing frontmatter without it, preserving other keys', () => {
    const result = ensureKaperId('---\ntags: [recipe]\naliases: [carbonara]\n---\n\nbody');
    expect(extractKaperId(result)).toMatch(ID_RE);
    expect(result).toContain('tags: [recipe]');
    expect(result).toContain('aliases: [carbonara]');
    expect(result).toContain('body');
  });

  it('is idempotent once stamped', () => {
    const once = ensureKaperId('---\ntags: [foo]\n---\n\nbody');
    const twice = ensureKaperId(once);
    expect(twice).toBe(once);
  });

  it('preserves prose and code blocks below the frontmatter', () => {
    const result = ensureKaperId('A classic.\n\n```kaper\ntitle: Carbonara\n```\n\nNotes.');
    expect(result).toContain('A classic.');
    expect(result).toContain('```kaper');
    expect(result).toContain('Notes.');
  });
});
