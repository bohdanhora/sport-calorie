'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_DURATION_MS = 420;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useAnimatedNumber = (value: number, durationMs = DEFAULT_DURATION_MS): number => {
  const [displayed, setDisplayed] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }

    if (prefersReducedMotion()) {
      previous.current = value;
      setDisplayed(value);
      return;
    }

    const from = previous.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now: number) {
      const elapsed = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - elapsed) ** 3;

      setDisplayed(from + (value - from) * eased);

      if (elapsed < 1) {
        frame = requestAnimationFrame(step);
      } else {
        previous.current = value;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return displayed;
};
