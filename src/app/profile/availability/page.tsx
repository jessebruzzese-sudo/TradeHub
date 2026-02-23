'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-nav';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { AvailabilityCalendar } from '@/components/availability-calendar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

  const handleSave = async () => {
    if (!currentUser) return;

    setSaving(true);
    try {
      const dateStrings = selectedDates.map((d) => d.toISOString().split('T')[0]);
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: dateStrings, description: description.trim() }),
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

  const showLoadingState = isLoading;
  const showUnauthorized = !isLoading && !currentUser;
  const showContent = currentUser != null;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            backLink={{ href: '/dashboard' }}
            title="List Subcontracting Dates"
            description="Surface spare capacity and help inform market insights"
          />

          {showLoadingState && (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-gray-600">Loading availability…</p>
            </div>
          )}

          {showUnauthorized && (
            <div className="mt-8">
              <UnauthorizedAccess redirectTo="/login" />
            </div>
          )}

          {showContent && (
            <div className="mt-8 space-y-6">
              {selectedDates.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                  <p className="text-gray-600 mb-4">No subcontracting dates added yet.</p>
                  <Button onClick={() => document.getElementById('availability-calendar')?.scrollIntoView({ behavior: 'smooth' })}>
                    Add dates
                  </Button>
                </div>
              )}
              <div id="availability-calendar">
                <AvailabilityCalendar
                  user={currentUser}
                  selectedDates={selectedDates}
                  onDatesChange={setSelectedDates}
                  onUpgrade={handleUpgrade}
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-base font-semibold mb-2 block">
                  Description (Optional)
                </Label>
                <p className="text-sm text-gray-600 mb-3">
                  Briefly describe your availability. Example: "Have two 2nd-year apprentices available for two weeks"
                </p>
                <Textarea
                  id="description"
                  placeholder="Describe your subcontracting availability..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/500 characters
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Subcontracting Dates'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
