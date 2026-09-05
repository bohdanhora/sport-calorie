import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // The e2e runner starts its own dev server; a separate build directory keeps it
  // from sharing (and corrupting) the chunks of a dev server already running.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  // Google's sign-in popup talks back to the page it was opened from. Without
  // this the browser refuses that postMessage, and the credential never lands.
  headers: async () => [
    {
      source: '/:path*',
      headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
    },
  ],
};

export default withNextIntl(nextConfig);
