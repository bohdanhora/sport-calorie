import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => ({
  id: '/',
  name: 'Sport Calorie',
  short_name: 'Sport Calorie',
  description: 'Track calories, food, walking and workouts in one place.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#15170f',
  theme_color: '#15170f',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    { name: 'Food', url: '/food' },
    { name: 'Activity', url: '/activity' },
    { name: 'Progress', url: '/progress' },
  ],
});

export default manifest;
