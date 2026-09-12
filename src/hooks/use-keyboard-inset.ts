'use client';

import { useEffect } from 'react';

export const useKeyboardInset = (): void => {
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const root = document.documentElement;

    const update = (): void => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
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
