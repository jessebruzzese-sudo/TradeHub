import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { BillingSimulationBanner } from '@/components/billing-simulation-banner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TradeHub - B2B Marketplace for Australian Contractors & Subcontractors',
  description: 'Connect Australian contractors with vetted subcontractors. Post jobs, find work, build trust through verified profiles and reliability reviews. Quality connections for the trades industry.',
  icons: {
    icon: '/TradeHub  -Mark-Main.svg',
    shortcut: '/TradeHub  -Mark-Main.svg',
    apple: '/TradeHub  -Mark-Main.svg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  themeColor: '#ffffff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TradeHub',
  },
  openGraph: {
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BillingSimulationBanner />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
