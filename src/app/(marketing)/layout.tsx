import { MarketingHeader } from '@/components/marketing-header';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-[100]">
        <MarketingHeader />
      </div>
      {children}
    </div>
  );
}
