import * as React from 'react';

/**
 * Shared icon set. All icons are Lucide-style on a 24×24 viewBox and inherit
 * color via `currentColor`, so they match whatever text color the surrounding
 * Obsidian theme applies. Each accepts an optional `size` (px); the defaults
 * preserve the sizes used at each original call site.
 */
function Stroke({ size = 18, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconChevronLeft = ({ size = 18 }: { size?: number }) => (
  <Stroke size={size}>
    <path d="M15 18l-6-6 6-6" />
  </Stroke>
);

export const IconChevronRight = ({ size = 18 }: { size?: number }) => (
  <Stroke size={size}>
    <path d="M9 18l6-6-6-6" />
  </Stroke>
);

export const IconTimer = ({ size = 14 }: { size?: number }) => (
  <Stroke size={size}>
    <line x1="10" x2="14" y1="2" y2="2" />
    <line x1="12" x2="15" y1="14" y2="11" />
    <circle cx="12" cy="14" r="8" />
  </Stroke>
);

export const IconUsers = ({ size = 14 }: { size?: number }) => (
  <Stroke size={size}>
    <path d="M18 21a8 8 0 0 0-16 0" />
    <circle cx="10" cy="8" r="5" />
    <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
  </Stroke>
);

export const IconGrip = ({ size = 14 }: { size?: number }) => (
  <Stroke size={size}>
    <circle cx="9" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="18" r="1" />
  </Stroke>
);

export const IconExternalLink = ({ size = 12 }: { size?: number }) => (
  <Stroke size={size}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Stroke>
);

/** Filled play triangle — solid, not stroked like the rest. */
export const IconPlay = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);
