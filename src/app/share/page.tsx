import Link from 'next/link';
import Image from 'next/image';
import { MarketingPageLayout } from '@/components/marketing-page-layout';
import { Button } from '@/components/ui/button';

export default function SharePage() {
  return (
    <MarketingPageLayout>
      <section className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/TradeHub-Horizontal-Main.svg"
            alt="TradeHub"
            width={320}
            height={80}
            className="h-auto w-[260px] sm:w-[320px]"
          />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900 md:text-4xl">
          B2B Marketplace for Australian Contractors
        </h1>
        <p className="mb-8 text-base text-gray-600 md:text-lg">
          Connect with contractors and subcontractors based on availability, trade and distance — without lead fees.
        </p>
        <Link href="/">
          <Button size="lg" className="bg-blue-600 px-8 hover:bg-blue-700">
            Go to TradeHub
          </Button>
        </Link>
      </section>
    </MarketingPageLayout>
  );
}
