'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/app-nav';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, TrendingUp, ChevronDown, ChevronUp, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { hasBuilderPremium } from '@/lib/capability-utils';

export default function PricingPage() {
  const { currentUser } = useAuth();
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const isPremium = currentUser ? hasBuilderPremium(currentUser) : false;

  const handleUpgrade = () => {
    alert('Subscription management coming soon! This will connect to payment processing.');
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 py-16 pb-32 md:pb-16">
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Premium User</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            One account. All TradeHub features. No lead selling.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Premium Plan - appears first on mobile, second on desktop */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 border-2 border-blue-600 rounded-2xl p-5 md:p-8 flex flex-col text-white relative overflow-hidden shadow-xl order-1 md:order-2">
            <div className="absolute top-3 right-3 md:top-4 md:right-4">
              <span className="px-2 py-0.5 md:px-3 md:py-1 bg-white/10 md:bg-white/20 backdrop-blur-sm text-white text-[10px] md:text-xs font-semibold rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
                RECOMMENDED
              </span>
            </div>

            <div className="mb-4 md:mb-6">
              <h3 className="text-2xl font-bold mb-2 md:mb-3">Premium</h3>
              <div className="mb-2 md:mb-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$30</span>
                  <span className="text-blue-100 text-sm md:text-base">/ month</span>
                </div>
                <div className="mt-1 md:mt-2 text-xs md:text-sm text-blue-100">
                  or <span className="font-semibold text-white">$60 / 3 months</span> (save $30)
                </div>
              </div>
              <p className="text-blue-100 leading-snug md:leading-relaxed hidden md:block mb-2 text-sm">
                Full access. No lead selling. Built for working trades.
              </p>
              <p className="text-blue-100 leading-snug md:hidden mb-1 text-xs">
                Full access. No lead selling.
              </p>
              <p className="text-[10px] md:text-xs text-blue-200">
                Best value for active contractors
              </p>
            </div>

            {/* Mobile: Feature chips */}
            <div className="md:hidden mb-4 flex-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/10 rounded-full px-3 py-1.5 text-xs text-white flex items-center gap-1.5">
                  <Check className="w-3 h-3 flex-shrink-0" />
                  <span>Unlimited tenders</span>
                </div>
                <div className="bg-white/10 rounded-full px-3 py-1.5 text-xs text-white flex items-center gap-1.5">
                  <Check className="w-3 h-3 flex-shrink-0" />
                  <span>Unlimited quotes</span>
                </div>
                <div className="bg-white/10 rounded-full px-3 py-1.5 text-xs text-white flex items-center gap-1.5">
                  <Check className="w-3 h-3 flex-shrink-0" />
                  <span>Instant alerts</span>
                </div>
                <div className="bg-white/10 rounded-full px-3 py-1.5 text-xs text-white flex items-center gap-1.5">
                  <Check className="w-3 h-3 flex-shrink-0" />
                  <span>Multi-trade</span>
                </div>
                <div className="bg-white/10 rounded-full px-3 py-1.5 text-xs text-white flex items-center gap-1.5 col-span-2 justify-center">
                  <Check className="w-3 h-3 flex-shrink-0" />
                  <span>Expanded radius</span>
                </div>
              </div>
            </div>

            {/* Desktop: Full feature list */}
            <ul className="space-y-3 mb-6 flex-1 hidden md:block">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Unlimited project tenders — post and manage work without caps</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Unlimited quotes — no per-lead or per-quote fees</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Instant trade alerts — notify available local trades (email + SMS)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Multi-trade access — work across multiple trades</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Expanded matching radius — reach the right trades, not everyone</span>
              </li>
            </ul>

            {/* Show all Premium features toggle */}
            <div className="mb-4 md:mb-6">
              <button
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="text-xs md:text-sm text-blue-100 hover:text-white underline flex items-center gap-1"
              >
                {showAllFeatures ? 'Show less' : 'Show all Premium features'}
                {showAllFeatures ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />}
              </button>

              {showAllFeatures && (
                <ul className="space-y-2 md:space-y-3 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/20">
                  <li className="flex items-start gap-2 md:gap-3">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs md:text-sm font-medium block">60-day availability calendar</span>
                      <span className="text-[10px] md:hidden text-blue-100 leading-snug block mt-0.5">Plan ahead and show availability</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs md:text-sm font-medium block">Market Rate Insights</span>
                      <span className="text-[10px] md:hidden text-blue-100 leading-snug block mt-0.5">Aggregated pricing data (no individual rates)</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs md:text-sm font-medium block">Unlimited project tenders</span>
                      <span className="text-[10px] md:hidden text-blue-100 leading-snug block mt-0.5">Post and manage work without caps</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs md:text-sm font-medium block">Unlimited quotes</span>
                      <span className="text-[10px] md:hidden text-blue-100 leading-snug block mt-0.5">No per-lead or per-quote fees</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs md:text-sm font-medium block">Instant trade alerts</span>
                      <span className="text-[10px] md:hidden text-blue-100 leading-snug block mt-0.5">Notify available local trades (email + SMS)</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs md:text-sm font-medium block">Multi-trade access</span>
                      <span className="text-[10px] md:hidden text-blue-100 leading-snug block mt-0.5">Work across multiple trades</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 md:gap-3">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-200 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs md:text-sm font-medium block">Expanded matching radius</span>
                      <span className="text-[10px] md:hidden text-blue-100 leading-snug block mt-0.5">Reach the right trades, not everyone</span>
                    </div>
                  </li>
                </ul>
              )}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:block">
              {currentUser ? (
                <Button onClick={handleUpgrade} className="w-full bg-white text-blue-600 hover:bg-blue-50" size="lg">
                  Upgrade to Premium
                </Button>
              ) : (
                <Link href="/signup">
                  <Button className="w-full bg-white text-blue-600 hover:bg-blue-50" size="lg">
                    Upgrade to Premium
                  </Button>
                </Link>
              )}

              <p className="text-xs text-blue-100 text-center mt-3">
                $60 for 3 months — save $30
              </p>
            </div>
          </div>

          {/* Free Plan - appears second on mobile, first on desktop */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 flex flex-col order-2 md:order-1">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Free</h3>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-bold text-gray-900">$0</span>
              </div>
              <p className="text-gray-600">Browse, trial, and get started.</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base text-gray-700">Browse jobs & tenders</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base text-gray-700">1 trial project tender</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base text-gray-700">Up to 3 quotes per tender</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base text-gray-700">15km visibility radius</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base text-gray-700">Basic messaging</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm md:text-base text-gray-700">Availability calendar (14 days)</span>
              </li>
            </ul>

            {!currentUser && (
              <Link href="/signup">
                <Button variant="outline" className="w-full" size="lg">
                  Continue with Free
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Lead Platform Comparison - separate card below Premium */}
        <div className="max-w-5xl mx-auto mt-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-1 md:mb-2">
                  Still cheaper than lead-based platforms
                </h4>
                <p className="text-xs md:text-sm text-gray-600 leading-snug md:leading-relaxed">
                  Most trade platforms charge per lead — often hundreds per month with no guarantee of work. TradeHub is a flat subscription with unlimited access.
                </p>
                <div className="mt-2 md:mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <BadgeCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>No lead fees · No commissions · No bidding</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Note */}
        <div className="max-w-5xl mx-auto mt-6 text-center">
          <p className="text-xs md:text-sm text-gray-600">
            ABN verification required to post jobs or tenders. Browsing is always free.
          </p>
        </div>

        {/* Mobile Accordion - What's included in Premium? - moved after Premium card */}
        <div className="max-w-5xl mx-auto mt-8 md:hidden">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setAccordionOpen(!accordionOpen)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-900">What's included in Premium?</span>
              {accordionOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {accordionOpen && (
              <div className="px-6 pb-6 border-t border-gray-200">
                <div className="pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Market Rate Insights</h4>
                  <p className="text-sm text-gray-700 mb-4">
                    Price work confidently without undercutting.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Data sources (aggregated only):</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Anonymised submitted quotes (delayed)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Accepted job prices</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Subcontractor availability signals</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Rules:</h5>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>25km radius</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Rounded ranges only (e.g. $55–$70/hr)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Minimum sample size required</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Rolling 60–90 day window</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>No real-time data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>No individual accounts shown</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Market Rate Insights (unchanged) */}
        <div className="mt-16 max-w-4xl mx-auto hidden md:block">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
            <div className="flex items-start gap-4">
              <TrendingUp className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Market Rate Insights (Premium Feature)</h3>
                <p className="text-gray-700 mb-4">
                  Inform pricing decisions without exposing individual rates or encouraging undercutting. Market Rate Insights provides aggregated data to help you price competitively and fairly.
                </p>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Data Sources (Aggregated Only):</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Anonymised quotes submitted (with delays)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Accepted job prices</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Subcontracting availability listings (signals only)</span>
                    </li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Rules:</h4>
                    <ul className="grid md:grid-cols-2 gap-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>25km radius</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Rounded ranges only (e.g. $55–$70/hr)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Minimum sample size required</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Rolling 60–90 day window</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>No real-time data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>No individual accounts shown</span>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-600 italic">
                      Example: "Based on recent market activity in your area..."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why TradeHub is Different - Mobile single-line rows, Desktop unchanged */}
        <div className="mt-8 max-w-5xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Why TradeHub is Different</h3>

            {/* Mobile: Single-line rows only */}
            <div className="md:hidden space-y-2">
              <div className="py-2 border-b border-gray-200 last:border-0 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 text-sm">No Lead Selling</h4>
                <Check className="w-4 h-4 text-green-600 opacity-80 flex-shrink-0" />
              </div>
              <div className="py-2 border-b border-gray-200 last:border-0 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 text-sm">No Commissions</h4>
                <Check className="w-4 h-4 text-green-600 opacity-80 flex-shrink-0" />
              </div>
              <div className="py-2 border-b border-gray-200 last:border-0 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 text-sm">Quality Matching</h4>
                <Check className="w-4 h-4 text-green-600 opacity-80 flex-shrink-0" />
              </div>
              <div className="py-2 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 text-sm">Built for Professionals</h4>
                <Check className="w-4 h-4 text-green-600 opacity-80 flex-shrink-0" />
              </div>
            </div>

            {/* Desktop: Updated grid layout */}
            <div className="hidden md:grid md:grid-cols-2 gap-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">No Lead Selling</h4>
                  <p className="text-sm text-gray-600">
                    Flat subscription. Unlimited access. No paying for dead leads. Your tenders go directly to qualified contractors.
                  </p>
                </div>
                <Check className="w-4 h-4 text-green-600 opacity-80 flex-shrink-0 ml-3 mt-0.5" />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">No Commissions</h4>
                  <p className="text-sm text-gray-600">
                    Simple subscription pricing. No hidden fees or commission on jobs.
                  </p>
                </div>
                <Check className="w-4 h-4 text-green-600 opacity-80 flex-shrink-0 ml-3 mt-0.5" />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Quality Over Quantity</h4>
                  <p className="text-sm text-gray-600">
                    Trade-specific matching ensures you only see relevant opportunities.
                  </p>
                </div>
                <Check className="w-4 h-4 text-green-600 opacity-80 flex-shrink-0 ml-3 mt-0.5" />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Built for Professionals</h4>
                  <p className="text-sm text-gray-600">
                    Designed specifically for builders, developers, and licensed contractors.
                  </p>
                </div>
                <Check className="w-4 h-4 text-green-600 opacity-80 flex-shrink-0 ml-3 mt-0.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Questions about pricing? <Link href="/messages" className="text-blue-600 hover:underline">Contact our team</Link>
          </p>
        </div>
      </div>

      {/* Sticky Mobile CTA - For ALL non-Premium users (logged in and logged out) */}
      {!isPremium && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-2">
              <p className="text-sm font-semibold text-gray-900">Upgrade to Premium — from $30/month</p>
              <p className="text-xs text-gray-600">$60 for 3 months (best value)</p>
            </div>
            {currentUser ? (
              <Button onClick={handleUpgrade} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Upgrade
              </Button>
            ) : (
              <Link href="/signup">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
