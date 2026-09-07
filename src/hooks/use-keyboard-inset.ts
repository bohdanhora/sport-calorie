'use client';

import { useEffect } from 'react';

/**
 * Publishes how much of the screen the on-screen keyboard covers as
 * `--keyboard-inset`.
 *
 * iOS does not shrink the layout viewport when the keyboard opens, it only
 * shrinks the visual one, so a bottom sheet pinned with `position: fixed` stays
 * exactly where it was and the field the user just tapped ends up behind the
 * keys. The visual viewport is the only thing that knows the difference.
 */
export const useKeyboardInset = (): void => {
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const root = document.documentElement;

    const update = (): void => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      // Rubber-band scrolling reports a fraction of a pixel either way, and
      // a sheet is not worth moving for that.
      const inset = covered > 1 ? Math.round(covered) : 0;

      root.style.setProperty('--keyboard-inset', `${inset}px`);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      root.style.removeProperty('--keyboard-inset');
    };
  }, []);
};
