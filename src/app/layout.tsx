import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Martian_Mono, Unbounded } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { Providers } from './providers';
import './globals.css';

const plex = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-plex',
});

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-unbounded',
});

const martian = Martian_Mono({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-martian',
});

const description = 'Track calories, food, walking and workouts in one place.';

export const metadata: Metadata = {
  metadataBase: new URL('https://sport-calorie.vercel.app'),
  title: 'Sport Calorie',
  description,
  applicationName: 'Sport Calorie',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Sport Calorie',
    title: 'Sport Calorie',
    description,
  },
  twitter: { card: 'summary_large_image', title: 'Sport Calorie', description },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f0f1ee' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0d0f' },
  ],
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${plex.variable} ${unbounded.variable} ${martian.variable}`}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
