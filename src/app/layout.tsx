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

export const metadata: Metadata = {
  title: 'Sport Calorie',
  description: 'Track calories, food, walking and workouts in one place.',
  applicationName: 'Sport Calorie',
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
