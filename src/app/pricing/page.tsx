import { redirect } from 'next/navigation';
import { MVP_FREE_MODE } from '@/lib/feature-flags';
import PricingContent from './pricing-content';

export const dynamic = 'force-dynamic';

export default function PricingPage() {
  if (MVP_FREE_MODE) {
    redirect('/');
  }

  return <PricingContent />;
}
