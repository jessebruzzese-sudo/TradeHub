import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';

// ✅ IMPORTANT: single source of truth for auth exports
// Make sure you have `lib/auth.ts` that re-exports from `auth-context.tsx`
// so pages and layout always use the same context instance.
import { AuthProvider } from '@/lib/auth';

import { BillingSimulationBanner } from '@/components/billing-simulation-banner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://tradehub.com.au'),
  title: 'TradeHub – B2B Marketplace for Australian Contractors',
  description:
    'TradeHub connects contractors and subcontractors based on availability, trade and distance — without lead fees.',
  icons: {
    icon: '/TradeHub  -Mark-Main.svg',
    shortcut: '/TradeHub  -Mark-Main.svg',
    apple: '/TradeHub  -Mark-Main.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TradeHub',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  themeColor: '#0ea5e9',
  openGraph: {
    title: 'TradeHub – B2B Marketplace for Australian Contractors',
    description: 'Connecting contractors and subcontractors without lead fees.',
    url: 'https://tradehub.com.au',
    siteName: 'TradeHub',
    images: [
      { url: '/og-image-v2.png', width: 1200, height: 630, alt: 'TradeHub' },
    ],
    locale: 'en_AU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeHub – B2B Marketplace for Australian Contractors',
    description:
      'TradeHub connects contractors and subcontractors based on availability, trade and distance — without lead fees.',
    images: ['/og-image-v2.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BillingSimulationBanner />
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
