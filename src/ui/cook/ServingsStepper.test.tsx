import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MIN_SERVINGS, ServingsStepper } from './ServingsStepper';

const noop = () => {};

function render(value: number) {
  return renderToStaticMarkup(<ServingsStepper value={value} onChange={noop} />);
}

describe('ServingsStepper', () => {
  it('shows the current servings between the −/+ controls', () => {
    const html = render(4);
    expect(html).toMatch(/kaper-cook__stepper-value"[^>]*>4</);
    expect(html).toContain('aria-label="Decrease servings"');
    expect(html).toContain('aria-label="Increase servings"');
  });

  it('names the control group for assistive tech', () => {
    expect(render(2)).toMatch(/role="group"[^>]*aria-label="Servings"/);
  });

  it('refuses to go below one serving', () => {
    const disabledDecrease = /<button[^>]*disabled[^>]*aria-label="Decrease servings"/;
    expect(render(MIN_SERVINGS)).toMatch(disabledDecrease);
    expect(render(MIN_SERVINGS + 1)).not.toMatch(disabledDecrease);
  });
});
