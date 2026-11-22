'use client';

import { useEffect } from 'react';

export const ServiceWorker = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
};
