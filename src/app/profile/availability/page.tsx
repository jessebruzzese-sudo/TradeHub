// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/app-nav';
import { RefinePillButton } from '@/components/ai/RefinePillButton';
import { useAuth } from '@/lib/auth';
import { AvailabilityCalendar } from '@/components/availability-calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getBrowserSupabase } from '@/lib/supabase-client';
import { UnauthorizedAccess } from '@/components/unauthorized-access';
import { notifyContractorsAboutAvailability } from '@/lib/notification-utils';

export default function AvailabilityPage() {
  const { currentUser, isLoading } = useAuth();
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const [pricingType, setPricingType] = useState<string>('');
  const [pricingAmount, setPricingAmount] = useState<string>('');
  const [showPricingPublicly, setShowPricingPublicly] = useState(false);

  const userId = currentUser?.id ?? null;

  const loadAvailability = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: availabilityData, error: availError } = await supabase
        .from('subcontractor_availability')
        .select('date, description')
        .eq('user_id', userId);

      let descriptionFromAvailability: string | null = null;
      if (!availError && availabilityData && availabilityData.length > 0) {
        const dates = availabilityData.map((item: any) => new Date(item.date));
        setSelectedDates(dates);
        if (availabilityData[0].description) {
          descriptionFromAvailability = availabilityData[0].description;
          setDescription(availabilityData[0].description);
        }
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('availability_description')
        .eq('id', userId)
        .maybeSingle();

      const hasDescriptionFromAvailability =
        descriptionFromAvailability != null && descriptionFromAvailability !== '';
      if (
        !userError &&
        userData?.availability_description &&
        !hasDescriptionFromAvailability
      ) {
        setDescription(userData.availability_description);
      }
    } catch (err) {
      console.error('Error loading availability:', err);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (!userId) return;
    loadAvailability();
  }, [userId, loadAvailability]);

  useEffect(() => {
    if (!currentUser) return;
    const pt = (currentUser as any)?.pricingType ?? (currentUser as any)?.pricing_type ?? '';
    setPricingType(pt === 'from_hourly' ? 'hourly' : pt ? String(pt) : '');
    const pa = (currentUser as any)?.pricingAmount ?? (currentUser as any)?.pricing_amount;
    setPricingAmount(pa != null ? String(pa) : '');
    const showProfile = (currentUser as any)?.showPricingOnProfile ?? (currentUser as any)?.show_pricing_on_profile ?? false;
    const showListings = (currentUser as any)?.showPricingInListings ?? (currentUser as any)?.show_pricing_in_listings ?? false;
    setShowPricingPublicly(showProfile || showListings);
  }, [currentUser?.id]);

  const handleSave = async () => {
    if (!currentUser) return;

    const amountNum = pricingAmount.trim() ? Number(pricingAmount) : null;
    if (pricingType && (pricingType === 'hourly' || pricingType === 'day') && amountNum != null && (amountNum <= 0 || !Number.isFinite(amountNum))) {
      toast.error('Please enter a valid positive amount.');
      return;
    }

    setSaving(true);
    try {
      const dateStrings = selectedDates.map((d) => d.toISOString().split('T')[0]);
      const payload: Record<string, unknown> = {
        dates: dateStrings,
        description: description.trim(),
      };

      if (pricingType) {
        payload.pricingType = pricingType;
        payload.pricingAmount =
          (pricingType === 'hourly' || pricingType === 'day') && pricingAmount.trim()
            ? Number(pricingAmount) || null
            : null;
        payload.showPricingOnProfile = showPricingPublicly;
        payload.showPricingInListings = showPricingPublicly;
      } else {
        payload.pricingType = null;
        payload.pricingAmount = null;
        payload.showPricingOnProfile = false;
        payload.showPricingInListings = false;
      }

      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && data.error) {
          toast.error(data.error);
          return;
        }
        throw new Error(data.error || 'Failed to save');
      }

      await notifyContractorsAboutAvailability(currentUser, selectedDates);
      toast.success('Subcontracting dates updated successfully');
      router.push('/dashboard');
    } catch (err) {
      console.error('Error saving availability:', err);
      toast.error('Failed to save subcontracting dates. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  async function refineDescriptionWithAI() {
    const raw = String(description ?? '').trim();
    if (!raw) {
      toast.error('Enter some text first, then refine with AI.');
      return;
    }

    try {
      setIsRefining(true);
      const trade = (currentUser as any)?.primaryTrade ?? (currentUser as any)?.primary_trade ?? '';
      const res = await fetch('/api/ai/refine-availability-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw, trade: trade || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || 'Could not refine description.');
        return;
      }

      const refined = String(data?.refined ?? '').trim();
      if (!refined) {
        toast.error('AI did not return a refinement. Try again.');
        return;
      }

      setDescription(refined);
      toast.success('Description refined.');
    } catch (e) {
      console.error('[availability] refine failed', e);
      toast.error('Could not refine description.');
    } finally {
      setIsRefining(false);
    }
  }

  const showLoadingState = isLoading;
  const showUnauthorized = !isLoading && !currentUser;
  const showContent = currentUser != null;

  if (showLoadingState) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-600">
          Loading availability…
        </div>
      </AppLayout>
    );
  }

  if (showUnauthorized) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  if (!showContent) {
    return null;
  }

  return (
    <AppLayout>
      {/* Grey wrapper — matches Jobs / Profile */}
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200">
        {/* Dotted overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.12) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />

        {/* Watermark */}
        <div className="pointer-events-none fixed bottom-[-220px] right-[-220px] z-0">
          <img
            src="/TradeHub-Mark-blackout.svg"
            alt=""
            aria-hidden="true"
            className="h-[1600px] w-[1600px] opacity-[0.06]"
          />
        </div>

        {/* Page content */}
        <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center text-sm text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>

          {/* Page title + subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              List Subcontracting Dates
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Surface spare capacity and help inform market insights
            </p>
          </div>

          {/* Single main card */}
          <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              {/* Calendar section — visual focal point */}
              <AvailabilityCalendar
                user={currentUser}
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                onUpgrade={handleUpgrade}
                embedded
              />

              {/* Description — softer supporting section */}
              <div className="mt-6 space-y-2 border-t border-slate-100 pt-6">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                  Description (Optional)
                </Label>
                <p className="text-sm text-slate-500">
                  Briefly describe your availability. Example: &quot;Have two 2nd-year apprentices
                  available for two weeks&quot;
                </p>
                <Textarea
                  id="description"
                  placeholder="Describe your subcontracting availability..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="resize-none border-slate-200 bg-slate-50/50"
                />
                <div className="mt-2 flex justify-end">
                  <RefinePillButton
                    size="sm"
                    variant="secondary"
                    loading={isRefining}
                    disabled={!String(description ?? '').trim() || saving}
                    onClick={refineDescriptionWithAI}
                    title={
                      !String(description ?? '').trim()
                        ? 'Enter some text first'
                        : 'Refine your description with AI'
                    }
                  />
                </div>
                <p className="text-xs text-slate-400">{description.length}/500 characters</p>
              </div>

              {/* Set pricing (Optional) */}
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    Set pricing (Optional)
                  </Label>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Share a typical rate if you want businesses to see it. You can also leave this blank.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="pricingType" className="sr-only">Pricing type</Label>
                    <Select value={pricingType || 'none'} onValueChange={(v) => setPricingType(v === 'none' ? '' : v)}>
                      <SelectTrigger className="border-slate-200 bg-slate-50/50">
                        <SelectValue placeholder="Select pricing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="hourly">Set hourly rate</SelectItem>
                        <SelectItem value="day">Set day rate</SelectItem>
                        <SelectItem value="quote_on_request">Quote on request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(pricingType === 'hourly' || pricingType === 'day') && (
                    <div className="min-w-0 flex-1 sm:max-w-[140px]">
                      <Label htmlFor="pricingAmount" className="sr-only">Amount ($)</Label>
                      <Input
                        id="pricingAmount"
                        type="number"
                        min={0}
                        step={1}
                        value={pricingAmount}
                        onChange={(e) => setPricingAmount(e.target.value)}
                        placeholder="$"
                        className="border-slate-200 bg-slate-50/50"
                      />
                    </div>
                  )}
                </div>
                {pricingType && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="showPricingPublicly"
                      checked={showPricingPublicly}
                      onCheckedChange={setShowPricingPublicly}
                    />
                    <Label htmlFor="showPricingPublicly" className="text-sm font-medium text-slate-700 cursor-pointer">
                      Show pricing publicly
                    </Label>
                  </div>
                )}
              </div>

              {/* Footer actions — calmer placement */}
              <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center">
                <Button onClick={handleSave} disabled={saving} className="sm:min-w-[200px]">
                  {saving ? 'Saving…' : 'Save Subcontracting Dates'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={saving}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
