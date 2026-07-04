import { describe, expect, it } from 'vitest';
import { extractKaperBlock, replaceKaperBlock } from './recipe-file';

const DOC = ['# Notes above', '', '```kaper', 'title: Old', '```', '', 'Notes below.'].join('\n');

describe('replaceKaperBlock', () => {
  it('replaces the block inner source and preserves surrounding content', () => {
    const next = replaceKaperBlock(DOC, 'title: New\n');
    expect(next).toBe(
      ['# Notes above', '', '```kaper', 'title: New', '```', '', 'Notes below.'].join('\n'),
    );
  });

  it('round-trips with extractKaperBlock', () => {
    const next = replaceKaperBlock(DOC, 'title: New\nservings: 2\n');
    expect(extractKaperBlock(next!)).toBe('title: New\nservings: 2');
  });

  it('only replaces the first block', () => {
    const doc = ['```kaper', 'a: 1', '```', '```kaper', 'b: 2', '```'].join('\n');
    const next = replaceKaperBlock(doc, 'a: 9\n');
    expect(next).toBe(['```kaper', 'a: 9', '```', '```kaper', 'b: 2', '```'].join('\n'));
  });

  it('returns null when there is no kaper block', () => {
    expect(replaceKaperBlock('just some notes', 'title: X\n')).toBeNull();
  });

  it('returns null for an unclosed fence', () => {
    expect(replaceKaperBlock('```kaper\ntitle: X', 'title: Y\n')).toBeNull();
  });
});
