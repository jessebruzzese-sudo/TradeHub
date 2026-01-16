'use client';

import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';

export default function PrivacyPage() {
  const currentDate = new Date().toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <TradeGate>
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
              <p className="text-sm text-gray-600 mb-8">Effective date: {currentDate}</p>

              <div className="prose prose-sm max-w-none space-y-6">
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
                  <p className="text-gray-700">
                    TradeHub may collect account information, profile details, platform usage data, and messages sent through the platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Information</h2>
                  <p className="text-gray-700">
                    Information is used to operate the platform, match users, send notifications, improve features, and maintain safety.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Sharing Information</h2>
                  <p className="text-gray-700">
                    Information may be shared with other users where necessary, service providers assisting platform operations, or where required by law. TradeHub does not sell personal information.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Storage & Security</h2>
                  <p className="text-gray-700">
                    Reasonable steps are taken to protect data. No system is completely secure.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">5. User Choices</h2>
                  <p className="text-gray-700">
                    Users may update profile information, request account deletion (subject to legal requirements), and opt out of non-essential communications.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Cookies</h2>
                  <p className="text-gray-700">
                    TradeHub may use cookies or similar technologies for basic functionality and analytics.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Changes to This Policy</h2>
                  <p className="text-gray-700">
                    This policy may be updated. Continued use indicates acceptance.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact</h2>
                  <p className="text-gray-700">
                    Privacy enquiries: support@tradehub.com
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </TradeGate>
  );
}
