// vim: ts=2
import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from "react";
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { BillingSimulationBanner } from '@/components/billing-simulation-banner';
import { Toaster } from "@/components/ui/sonner";
import { ENV } from "@/lib/env";
import { ThemeProvider } from "@mui/material/styles";
import TradeHubTheme from "@/lib/theme/service";

const inter = Inter({ subsets: ['latin'] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL('https://tradehub.com.au'),
  title: 'TradeHub - B2B Marketplace for Australian Contractors',
  description:
    'TradeHub connects contractors and subcontractors based on availability, trade and distance - without lead fees.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TradeHub',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: 'TradeHub - B2B Marketplace for Australian Contractors',
    description: 'Connecting contractors and subcontractors without lead fees.',
    url: 'https://tradehub.com.au',
    siteName: 'TradeHub',
    images: [{ url: '/og-image-v2.png', width: 1200, height: 630, alt: 'TradeHub' }],
    locale: 'en_AU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeHub - B2B Marketplace for Australian Contractors',
    description:
      'TradeHub connects contractors and subcontractors based on availability, trade and distance - without lead fees.',
    images: ['/og-image-v2.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
				<ThemeProvider theme={TradeHubTheme}>
					<BillingSimulationBanner/>
        	<AuthProvider>
						<Toaster/>
						<Suspense>
							{children}
						</Suspense>
        	</AuthProvider>
				</ThemeProvider>
      </body>
    </html>
  );
}
