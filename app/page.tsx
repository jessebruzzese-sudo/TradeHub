'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CircleCheck as CheckCircle2, Shield, FileText, MapPin, MessageSquare, ShieldCheck, Clock, Upload, Users, Target, DollarSign, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { StatusPill } from '@/components/status-pill';
import { useEffect, useState } from 'react';
import { buildLoginUrl } from '@/lib/url-utils';
import { safeRouterPush } from '@/lib/safe-nav';

export default function HomePage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCreateTender = () => {
    if (!currentUser) {
      safeRouterPush(router, buildLoginUrl('/tenders/create'), '/login');
    } else {
      safeRouterPush(router, '/tenders/create', '/tenders/create');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/TradeHub -Horizontal-Main with tagline.svg" alt="TradeHub" width={140} height={32} className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/tenders" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Tenders
            </Link>
            <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              How Tendering Works
            </button>
            <button onClick={() => scrollToSection('trust')} className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Trust & Safety
            </button>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Pricing
            </Link>
            {currentUser?.role === 'admin' && (
              <Link href="/admin" className="text-red-600 hover:text-red-700 text-sm font-medium">
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <Button onClick={() => router.push(currentUser?.role === 'admin' ? '/admin' : '/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="hidden sm:inline-flex">Log In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Create Account</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 py-8 md:py-16 bg-gradient-to-b from-gray-50 to-white md:bg-none">
          <div className="max-w-4xl mx-auto">
            <div className="text-center md:text-left">
              <h1 className={`text-3xl md:text-5xl lg:text-6xl font-extrabold md:font-bold text-gray-900 mb-3 md:mb-4 leading-tight md:leading-normal transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 md:opacity-100 md:translate-y-0'}`}>
                Price projects <span className="uppercase text-blue-600 md:text-gray-900 md:normal-case">without</span> chasing trades
              </h1>
              <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-8 leading-relaxed">
                TradeHub helps you hire subcontractors and find real work: post tenders, receive quotes, and browse jobs — not bought leads.
              </p>

              <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <Button size="lg" className="w-full text-base px-8 py-6 bg-blue-600 hover:bg-blue-700" onClick={handleCreateTender}>
                  Post a Project Tender
                </Button>
                <Link href="/tenders" className="block">
                  <Button size="lg" variant="outline" className="w-full text-base px-8 py-6">
                    View Available Tenders
                  </Button>
                </Link>
                <Link href={currentUser ? '/jobs' : buildLoginUrl('/jobs')} className="block">
                  <Button size="lg" className="w-full text-base px-8 py-6 bg-yellow-500 hover:bg-yellow-600 text-gray-900">
                    Find Jobs
                  </Button>
                </Link>
                <Link href="/jobs/create" className="block">
                  <Button size="lg" className="w-full text-base px-8 py-6 bg-green-600 hover:bg-green-700 text-white">
                    Post a Job
                  </Button>
                </Link>
              </div>

              <div className="block md:hidden mb-12">
                <div className={`transition-all duration-500 delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 md:opacity-100 md:translate-y-0'}`}>
                  {currentUser ? (
                    <Button size="lg" className="w-full text-base px-6 py-6 bg-blue-600 hover:bg-blue-700 shadow-lg rounded-2xl font-semibold" onClick={() => router.push(currentUser?.role === 'admin' ? '/admin' : '/dashboard')}>
                      Go to Dashboard
                    </Button>
                  ) : (
                    <Link href="/signup">
                      <Button size="lg" className="w-full text-base px-6 py-6 bg-blue-600 hover:bg-blue-700 shadow-lg rounded-2xl font-semibold">
                        Get Started
                      </Button>
                    </Link>
                  )}
                  <p className="text-center text-xs text-gray-500 mt-3">
                    Free to join • No paid leads
                  </p>
                </div>
              </div>

              <div className="hidden md:flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-sm text-gray-700 mb-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>No lead selling</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Radius-based matching</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Trial tender included</span>
                </div>
              </div>

              <div className="flex md:hidden flex-col items-center gap-5 text-center pt-6 border-t border-gray-200">
                <Link href="/how-it-works" className="text-base font-semibold text-gray-700 hover:text-gray-900">
                  How it works?
                </Link>
                <Link href="/how-tendering-works" className="text-base font-semibold text-gray-700 hover:text-gray-900">
                  How project tendering works?
                </Link>
                <Link href="/faqs" className="text-base font-semibold text-gray-700 hover:text-gray-900">
                  FAQs?
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden md:block py-8 md:py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">

            <div className="hidden md:block">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">How TradeHub Works</h2>
                <p className="text-sm md:text-base text-gray-600">
                  Choose how you use the platform.
                </p>
              </div>
            </div>

            <div className="hidden md:grid md:grid-cols-3 gap-6">
              <div className="bg-white border-2 border-blue-300 rounded-xl p-6 relative">
                <div className="absolute -top-3 left-4">
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    PRIMARY FEATURE
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 mt-2">Project Tendering</h3>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium text-gray-900">For Builders & Developers</span>
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Upload plans and request quotes from relevant trades — even if you don't know local contractors.
                </p>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Upload plans & scopes</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Select required trades</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Control radius & quote limits</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Compare quotes privately</span>
                  </li>
                </ul>

                <Button className="w-full mb-3" onClick={handleCreateTender}>Post a Project Tender</Button>
                <button
                  onClick={() => scrollToSection('tendering-detail')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto"
                >
                  How tendering works <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Contractors</h3>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium text-gray-900">For Builders & trade companies hiring subcontractors</span>
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Post jobs, manage applications, and hire subcontractors with confidence.
                </p>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Post standard jobs</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Review applications</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Message before hiring</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Leave reliability reviews</span>
                  </li>
                </ul>

                <Link href="/jobs/create" className="block mb-3">
                  <Button className="w-full" variant="outline">Post a Job</Button>
                </Link>
                <button
                  onClick={() => scrollToSection('contractors')}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1 mx-auto"
                >
                  Contractor features <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Subcontractors</h3>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium text-gray-900">For Licensed trades & subcontracting businesses</span>
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Find real work opportunities and quote projects that match your trade and location.
                </p>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>View tenders & jobs</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Quote real projects (not leads)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Set radius & alerts</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Build reputation</span>
                  </li>
                </ul>

                <Link href={currentUser ? '/tenders' : '/login?returnUrl=/tenders'} className="block mb-3">
                  <Button className="w-full" variant="outline">View Available Work</Button>
                </Link>
                <Link href="/how-it-works/subcontractors" className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1 mx-auto justify-center">
                  How subcontractor listings work <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="tendering-detail" className="hidden md:block py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">How Project Tendering Works</h2>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                A transparent process for pricing construction projects
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-bold text-blue-600 mb-2">Step 1</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Plans</h3>
                <p className="text-sm text-gray-600">
                  Upload drawings, scopes, or specifications. Only suburb and postcode are shown.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-bold text-blue-600 mb-2">Step 2</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Select Trades & Radius</h3>
                <p className="text-sm text-gray-600">
                  Choose the trades you need and how far you want to reach.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-bold text-blue-600 mb-2">Step 3</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Receive Quotes</h3>
                <p className="text-sm text-gray-600">
                  Verified contractors submit quotes directly — no paid leads.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-sm font-bold text-blue-600 mb-2">Step 4</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Convert to Job</h3>
                <p className="text-sm text-gray-600">
                  Message, shortlist, and convert a tender into a confirmed job.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="hidden md:block bg-gray-50 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
                  Built for Builders & Developers
                </h2>
                <p className="text-base md:text-lg text-gray-600 mb-6">
                  Price jobs even if you don't know local trades. TradeHub connects you with verified contractors without the hassle of chasing quotes or buying leads.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Price jobs even if you don't know local trades</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Upload plans once — no repeated explaining</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Control how many quotes you receive</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Hide your business name if pricing competitively</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Pay per tender or subscribe — no lock-in</span>
                  </li>
                </ul>
                <Button size="lg" className="w-full md:w-auto" onClick={handleCreateTender}>
                  Post a Project Tender
                </Button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-gray-900">Free</span>
                    </div>
                    <p className="text-sm text-gray-600">1 trial tender, then pay-per-tender; 15km radius, up to 3 quotes</p>
                    <div className="text-right mt-2">
                      <span className="text-lg font-bold text-gray-900">$0</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-4 shadow-md">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Premium</span>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium mb-1">Full access to TradeHub</p>
                    <p className="text-xs text-gray-600 mb-2">Post tenders, receive quotes, browse jobs, and use market insights. No lead selling.</p>
                    <div className="text-right mt-2">
                      <span className="text-lg font-bold text-gray-900">$30</span>
                      <span className="text-xs text-gray-500 ml-1">per month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contractors" className="hidden md:block py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">Free</span>
                      </div>
                      <p className="text-sm text-gray-600">Limited access, browse tenders & jobs</p>
                      <div className="text-right mt-2">
                        <span className="text-lg font-bold text-gray-900">$0</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-4 shadow-md">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">Premium</span>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium mb-1">Full access to TradeHub</p>
                      <p className="text-xs text-gray-600 mb-2">Post tenders, receive quotes, browse jobs, and use market insights. No lead selling.</p>
                      <div className="text-right mt-2">
                        <span className="text-lg font-bold text-gray-900">$30</span>
                        <span className="text-xs text-gray-500 ml-1">per month</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 md:order-2">
                <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
                  For Contractors — Quote real projects, not bought leads
                </h2>
                <p className="text-base md:text-lg text-gray-600 mb-6">
                  View project tenders with full documentation. Quote only work that fits your trade and location. No per-lead fees.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">View real project tenders with full documentation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Quote only work that fits your trade and location</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Flat monthly pricing — no per-lead fees</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Control alerts and radius</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Hire out staff or yourself when you have spare capacity</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-700">Find reliable subcontractors for your projects</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="hidden md:block bg-gray-50 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">Trust & Verification</h2>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                Transparent systems that support safe tendering and professional relationships
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Verified Accounts</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Verification improves visibility and builds trust. Submit business documents, ABN, or alternative identification.
                </p>
                <div className="flex flex-wrap gap-2">
                  <StatusPill type="trust" status="pending" />
                  <StatusPill type="trust" status="verified" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Reliability Reviews</h3>
                <p className="text-sm text-gray-600">
                  Context-focused reviews for late cancellations. Both parties can share their perspective. All reviews are moderated for fairness.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Transparent Rules</h3>
                <p className="text-sm text-gray-600">
                  Clear dispute and moderation rules. Job-based messaging keeps conversations professional and organised.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Location Privacy</h3>
                  <p className="text-sm md:text-base text-gray-700">
                    Tender locations show only suburb and postcode. Exact addresses are never shared until you choose to accept a quote and convert to a job. This protects your project details while enabling radius-based contractor matching.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden md:block py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">What is the difference between a tender and a job?</h3>
                <p className="text-sm md:text-base text-gray-600">
                  A tender is a pricing request where you upload plans and receive multiple quotes from contractors. Once you accept a quote, you can convert it into a confirmed job with messaging and coordination. Jobs are ongoing work arrangements, while tenders are the quoting phase.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">How does pricing work?</h3>
                <p className="text-sm md:text-base text-gray-600">
                  Everyone gets free access to browse tenders and jobs, with 1 trial tender included. After that, pay per tender or subscribe to Premium ($30/month or $60 for 3 months) for unlimited tenders, quotes, multi-trade access, alerts, and market rate insights. One account type for everyone — no lead selling.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">Is my project location visible to everyone?</h3>
                <p className="text-sm md:text-base text-gray-600">
                  No. Tenders only show suburb and postcode — never your exact address. This protects your privacy while enabling contractors to assess distance. Exact addresses are shared only after you accept a quote and create a job.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">Does TradeHub sell leads?</h3>
                <p className="text-sm md:text-base text-gray-600">
                  No. TradeHub never sells leads. Contractors access tenders through flat monthly subscriptions (or 1 free quote per month). There are no per-lead fees. You control who sees your tender based on radius and trade selection.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">Can I hide my business name when posting a tender?</h3>
                <p className="text-sm md:text-base text-gray-600">
                  Yes. You can choose to hide your business name when posting a tender. Contractors will see "Verified Builder" instead. This is useful when pricing competitively or working with unknown contractors.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">How does verification work?</h3>
                <p className="text-sm md:text-base text-gray-600">
                  Verification is optional but recommended. Submit business documents, ABN, or alternative identification. Verified users get better visibility and build trust faster. You can use TradeHub unverified, but verification significantly improves connection quality.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden md:block py-12 md:py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-8">
              Post your first tender or browse available projects today
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              <Button size="lg" className="w-full text-base px-8 py-6 bg-blue-600 hover:bg-blue-700" onClick={handleCreateTender}>
                Post a Project Tender
              </Button>
              <Link href="/tenders" className="block">
                <Button size="lg" variant="outline" className="w-full text-base px-8 py-6">
                  View Available Tenders
                </Button>
              </Link>
              <Link href={currentUser ? '/jobs' : '/login?returnUrl=/jobs'} className="block">
                <Button size="lg" className="w-full text-base px-8 py-6 bg-yellow-500 hover:bg-yellow-600 text-gray-900">
                  Find Jobs
                </Button>
              </Link>
              <Link href="/jobs/create" className="block">
                <Button size="lg" className="w-full text-base px-8 py-6 bg-green-600 hover:bg-green-700 text-white">
                  Post a Job
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Image src="/TradeHub  -Mark-Main.svg" alt="TradeHub" width={32} height={32} className="w-8 h-8" />
              <span className="text-gray-600 text-sm">© 2024 TradeHub. Australian construction marketplace.</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <Link href="/tenders" className="text-gray-600 hover:text-gray-900 text-sm">
                Tenders
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 text-sm">
                Pricing
              </Link>
              <button onClick={() => scrollToSection('trust')} className="text-gray-600 hover:text-gray-900 text-sm">
                Trust & Safety
              </button>
              <Link href="/jobs" className="text-gray-600 hover:text-gray-900 text-sm">
                Jobs
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900 text-sm">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-900 text-sm">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
