import { MarketingHeader } from '@/components/marketing-header';
import PricingContent from './pricing-content';

export const dynamic = 'force-dynamic';

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800">
      <div className="sticky top-0 z-[100] border-b border-white/10 bg-blue-600/90 backdrop-blur">
        <MarketingHeader />
      </div>

      <PricingContent />
    </div>
  );
}
