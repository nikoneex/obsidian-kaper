import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PreviewImage } from './PreviewImage';

describe('PreviewImage', () => {
  it('renders an <img> for a non-empty src', () => {
    const html = renderToStaticMarkup(<PreviewImage src="cover.png" className="x" />);
    expect(html).toContain('<img');
    expect(html).toContain('src="cover.png"');
    expect(html).toContain('class="x"');
  });

  it('renders nothing when src is empty (guards against a broken-image icon)', () => {
    const html = renderToStaticMarkup(<PreviewImage src="" className="x" />);
    expect(html).toBe('');
  });
});
