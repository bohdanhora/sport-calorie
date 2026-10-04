import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
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
    { media: '(prefers-color-scheme: light)', color: '#fbfbfa' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0d0e' },
  ],
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
