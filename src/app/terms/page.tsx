import { MarketingPageLayout } from '@/components/marketing-page-layout';

export const metadata = {
  title: 'Terms of Service – TradeHub',
  description: 'TradeHub Terms of Service – marketplace platform connecting Australian contractors and subcontractors.',
};

export default function TermsPage() {
  return (
    <MarketingPageLayout>
        <div className="bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
              <p className="text-sm text-gray-600 mb-8">Effective date: 16 January 2026</p>

              <div className="prose prose-sm max-w-none space-y-6">
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">1. About TradeHub</h2>
                  <p className="text-gray-700 mb-2">
                    TradeHub is an online marketplace that connects contractors and subcontractors. TradeHub provides a platform only and does not perform trade or labour services.
                  </p>
                  <p className="text-gray-700 mb-2">TradeHub is not:</p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>An employer</li>
                    <li>A recruitment agency</li>
                    <li>A party to agreements between users</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">2. User Accounts</h2>
                  <p className="text-gray-700">
                    Users must provide accurate information and maintain any licences, insurance, and legal compliance required for their trade. Users are responsible for all activity on their account.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Founding Access</h2>
                  <p className="text-gray-700 mb-3">
                    TradeHub may offer early users access to features, pricing, or functionality as part of a Founding Access period.
                  </p>
                  <p className="text-gray-700 mb-3">
                    Founding Access is provided on a discretionary and temporary basis and may include features or benefits that are modified, limited, or removed as the platform evolves.
                  </p>
                  <p className="text-gray-700 mb-3">
                    TradeHub does not guarantee the ongoing availability of Founding Access features, pricing, or conditions, and changes may occur as the platform develops.
                  </p>
                  <p className="text-gray-700">
                    Continued use of the platform after any changes indicates acceptance of the updated features or terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">4. No Employment Relationship</h2>
                  <p className="text-gray-700">
                    Use of TradeHub does not create an employment, partnership, joint venture, or agency relationship between TradeHub and users, or between users themselves.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Jobs, Tenders & Availability</h2>
                  <p className="text-gray-700">
                    Listings, tenders, and availability indicators are informational only. TradeHub does not guarantee work, payment, performance, or outcomes. All agreements are made directly between users.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Payments & Disputes</h2>
                  <p className="text-gray-700">
                    Unless explicitly stated otherwise, TradeHub does not process payments and is not responsible for disputes, non-payment, or work quality. Users must resolve disputes directly.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Platform Rules & Fair Use</h2>
                  <p className="text-gray-700">
                    TradeHub may review activity, restrict access, or suspend accounts that breach platform rules or misuse features.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
                  <p className="text-gray-700">
                    To the maximum extent permitted by law, TradeHub is not liable for losses arising from work arranged through the platform. Nothing excludes rights under Australian Consumer Law.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to These Terms</h2>
                  <p className="text-gray-700">
                    TradeHub may update these terms. Continued use of the platform indicates acceptance.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
                  <p className="text-gray-700">
                    For questions, contact:{' '}
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
