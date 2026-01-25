import { Metadata } from 'next';
import { isUUID, parseTradeSuburbSlug, formatSuburbForDisplay } from '@/lib/slug-utils';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params;

  if (!isUUID(id)) {
    const parsed = parseTradeSuburbSlug(id);
    if (parsed) {
      const displaySuburb = formatSuburbForDisplay(parsed.suburb);
      return {
        title: `${parsed.trade} Work in ${displaySuburb} - Available Tenders | TradeHub`,
        description: `Find ${parsed.trade.toLowerCase()} work and tenders in ${displaySuburb}. Browse construction projects, submit quotes, and connect with verified contractors in your area. ${parsed.trade} jobs available now.`,
        robots: 'index, follow',
        openGraph: {
          title: `${parsed.trade} Work in ${displaySuburb} - Available Tenders | TradeHub`,
          description: `Find ${parsed.trade.toLowerCase()} work and tenders in ${displaySuburb}. Browse construction projects and submit quotes.`,
          type: 'website',
        },
      };
    }
  }

  return {
    title: 'Tender Details - Construction & Trade Work | TradeHub',
    description: 'View tender details and submit your quote. Join TradeHub to access full project information including scope, budget, timeline, and documents.',
    robots: 'index, follow',
    openGraph: {
      title: 'Tender Details - Construction & Trade Work | TradeHub',
      description: 'View tender details and submit your quote on TradeHub.',
      type: 'website',
    },
  };
}

export default function TenderDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
