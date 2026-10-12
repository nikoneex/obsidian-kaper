import { useEffect, useState } from 'react';

/**
 * Renders an image that quietly removes itself if the source fails to load
 * (missing file, unreachable URL), so a bad path shows nothing rather than a
 * broken-image icon. Resets on `src` change so fixing the path re-attempts it.
 */
export function PreviewImage({ src, className }: { src: string; className: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return null;
  return <img className={className} src={src} alt="" onError={() => setFailed(true)} />;
}
