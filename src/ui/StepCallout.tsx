import * as React from 'react';

type CalloutKind = 'tip' | 'warning';

const LABELS: Record<CalloutKind, string> = {
  tip: 'Tip',
  warning: 'Heads up',
};

/**
 * A bordered step aside — a tip or a warning — rendered identically across the
 * recipe preview and Cook mode. `block` is the host surface's BEM block (e.g.
 * `kaper-preview` or `kaper-cook`) so each keeps its own spacing/scale via its
 * own CSS while sharing the markup, labels, and tip/warning accent semantics.
 */
export function StepCallout({
  block,
  kind,
  children,
}: {
  block: string;
  kind: CalloutKind;
  children: React.ReactNode;
}) {
  return (
    <div className={`${block}__callout ${block}__callout--${kind}`}>
      <span className={`${block}__callout-label`}>{LABELS[kind]}</span>
      <span className={`${block}__callout-text`}>{children}</span>
    </div>
  );
}
