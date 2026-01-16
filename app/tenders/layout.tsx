import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Available Tenders - Find Construction & Trade Work | TradeHub',
    description: 'Browse available construction and trade tenders from verified Australian contractors. Find work opportunities across all trades including electrical, plumbing, carpentry, and more.',
    robots: 'index, follow',
    openGraph: {
      title: 'Available Tenders - Find Construction & Trade Work | TradeHub',
      description: 'Browse available construction and trade tenders from verified Australian contractors.',
      type: 'website',
    },
  };
}

export default function TendersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
