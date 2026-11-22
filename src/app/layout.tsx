import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { ServiceWorker } from '@/components/layout/service-worker';

import { Providers } from './providers';
import './globals.css';

const rubik = Rubik({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-rubik',
});

const description = 'Track calories, food, walking and workouts in one place.';

export const metadata: Metadata = {
  metadataBase: new URL('https://sport-calorie.vercel.app'),
  title: 'Sport Calorie',
  description,
  applicationName: 'Sport Calorie',
  appleWebApp: { capable: true, title: 'Sport Calorie', statusBarStyle: 'default' },
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
    { media: '(prefers-color-scheme: light)', color: '#eeefe7' },
    { media: '(prefers-color-scheme: dark)', color: '#15170f' },
  ],
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale} suppressHydrationWarning className={rubik.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
          <ServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
