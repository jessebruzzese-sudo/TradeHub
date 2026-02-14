import { MarketingPageLayout } from '@/components/marketing-page-layout';

export const metadata = {
  title: 'Privacy Policy – TradeHub',
  description: 'TradeHub Privacy Policy – how we collect, use and protect your data.',
};

export default function PrivacyPage() {
  return (
    <MarketingPageLayout>
      <div className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-600 mb-8">Effective date: 16 January 2026</p>

            <div className="prose prose-sm max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who We Are</h2>
                <p className="text-gray-700">
                  TradeHub is an online marketplace that connects contractors and subcontractors in Australia.
                  We provide a platform for posting jobs, tenders, and matching businesses based on trade, location, and availability.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>
                    <strong>Account information:</strong> Email, name or business name, and phone number when you provide it.
                  </li>
                  <li>
                    <strong>Profile & business details:</strong> Trade categories, location, radius preferences, ABN, and verification status.
                  </li>
                  <li>
                    <strong>Content you create:</strong> Jobs, tenders, messages, and any files or uploads you submit through the platform.
                  </li>
                  <li>
                    <strong>Payment/billing info (if Stripe is enabled):</strong> We do not store card details. Stripe processes payments. We store subscription status and customer identifiers (e.g. Stripe customer ID) to manage your subscription.
                  </li>
                  <li>
                    <strong>Technical data:</strong> IP address, device and browser logs for security and platform operation only. We do not currently use analytics or tracking tools.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Information</h2>
                <p className="text-gray-700 mb-2">
                  We use your information to:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Provide and operate the platform</li>
                  <li>Verify accounts and ABN</li>
                  <li>Enable matching between contractors and subcontractors</li>
                  <li>Prevent fraud and abuse</li>
                  <li>Respond to support requests</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Sharing Information</h2>
                <p className="text-gray-700 mb-2">
                  We may share information with:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li><strong>Supabase:</strong> Hosting, authentication, and database storage</li>
                  <li><strong>Vercel:</strong> Hosting and deployment</li>
                  <li><strong>Stripe:</strong> Payment processing (if enabled)</li>
                  <li><strong>Legal compliance:</strong> When required by law or to protect rights and safety</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  We do not sell your personal information.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Storage, Security & Retention</h2>
                <p className="text-gray-700">
                  We take reasonable steps to protect your data. Data is stored with our service providers (Supabase, Vercel).
                  We retain your information for as long as your account is active or as needed to provide the service,
                  and for legitimate business or legal purposes. No system is completely secure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
                <p className="text-gray-700 mb-2">
                  You have the right to access, correct, and request deletion of your personal information.
                  To exercise these rights, contact us at{' '}
                  <a href="mailto:support@tradehub.com.au" className="text-blue-600 hover:underline">
                    support@tradehub.com.au
                  </a>.
                  We will respond in accordance with applicable law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Changes to This Policy</h2>
                <p className="text-gray-700">
                  We may update this policy. Continued use of the platform after changes indicates acceptance.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact</h2>
                <p className="text-gray-700">
                  Privacy enquiries:{' '}
                  <a href="mailto:support@tradehub.com.au" className="text-blue-600 hover:underline">
                    support@tradehub.com.au
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
