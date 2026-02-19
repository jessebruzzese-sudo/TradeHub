'use client';

import { useUpgradeCheckout, type BillingPlanKey } from '@/lib/use-upgrade-checkout';

export default function UpgradeTestPage() {
  const businessCheckout = useUpgradeCheckout('BUSINESS_PRO_20');
  const subcontractorCheckout = useUpgradeCheckout('SUBCONTRACTOR_PRO_10');
  const allAccessCheckout = useUpgradeCheckout('ALL_ACCESS_PRO_26');
  const invalidPlanCheckout = useUpgradeCheckout('TEST_PLAN' as BillingPlanKey);

  const buttons = [
    {
      label: 'BUSINESS_PRO_20',
      checkout: businessCheckout,
      placement: 'upgrade_test_business',
    },
    {
      label: 'SUBCONTRACTOR_PRO_10',
      checkout: subcontractorCheckout,
      placement: 'upgrade_test_subcontractor',
    },
    {
      label: 'ALL_ACCESS_PRO_26',
      checkout: allAccessCheckout,
      placement: 'upgrade_test_all_access',
    },
    {
      label: 'TEST_PLAN (fake plan for failure testing)',
      checkout: invalidPlanCheckout,
      placement: 'upgrade_test_invalid_plan',
    },
  ] as const;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Upgrade Checkout Test</h1>
      <div className="flex flex-col gap-3">
        {buttons.map(({ label, checkout, placement }) => (
          <button
            key={placement}
            type="button"
            disabled={checkout.isLoading}
            onClick={() => checkout.handleUpgrade(placement)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkout.isLoading ? 'Processing...' : label}
          </button>
        ))}
      </div>
    </div>
  );
}
