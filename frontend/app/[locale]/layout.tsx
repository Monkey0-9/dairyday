import type { Metadata, Viewport } from 'next';
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Providers } from '@/components/providers';
import { ToastProvider } from '@/components/ui/toast-provider';
import { FontSizeProvider } from '@/components/font-size-provider';
import { LazyAIAssistant } from '@/components/lazy-ai-assistant';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' }
  ],
}

export const metadata: Metadata = {
  title: 'DairyDay — Premium Dairy Management',
  description: 'Elite dairy management platform for Indian dairy farms. Track collection, automate billing, and accept UPI payments with 99.9% reliability.',
  keywords: ['dairy management', 'milk collection', 'automated billing', 'Indian dairy software', 'dairy SaaS'],
  manifest: '/manifest.json',
  metadataBase: new URL('https://dairyday.app'), // Replace with actual production domain
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'DairyDay — Premium Dairy Management',
    description: 'Elite dairy management platform for Indian dairy farms. Track collection, automate billing, and accept UPI payments with 99.9% reliability.',
    url: 'https://dairyday.app',
    siteName: 'DairyDay',
    images: [
      {
        url: '/og-image.png', // Ensure this file exists or will be created
        width: 1200,
        height: 630,
        alt: 'DairyDay Strategic Command Interface',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DairyDay — Premium Dairy Management',
    description: 'Elite dairy management platform for Indian dairy farms. Track collection, automate billing, and accept UPI payments.',
    images: ['/og-image.png'],
    creator: '@dairyday_app',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DairyDay',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || ''} />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || ''} crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${mono.variable} font-sans`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <Providers>
              <ToastProvider>
                <FontSizeProvider>
                  <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                    <div className="absolute inset-0 bg-background" />
                    <div className="absolute -top-[40%] -left-[20%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[150px]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
                  </div>
                  {children}
                  <LazyAIAssistant />
                </FontSizeProvider>
              </ToastProvider>
            </Providers>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
