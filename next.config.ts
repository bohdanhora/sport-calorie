import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
    },
  ],
};

export default withNextIntl(nextConfig);
