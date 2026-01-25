'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-nav';
import { TradeGate } from '@/components/trade-gate';
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

  useEffect(() => {
    if (currentUser) {
      loadAvailability();
    }
  }, [currentUser]);

  const loadAvailability = async () => {
    if (!currentUser) return;

    try {
      const { data: availabilityData, error: availError } = await supabase
        .from('subcontractor_availability')
        .select('date, description')
        .eq('user_id', currentUser.id);

      if (!availError && availabilityData && availabilityData.length > 0) {
        const dates = availabilityData.map((item: any) => new Date(item.date));
        setSelectedDates(dates);
        if (availabilityData[0].description) {
          setDescription(availabilityData[0].description);
        }
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('availability_description')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!userError && userData && userData.availability_description && !description) {
        setDescription(userData.availability_description);
      }
    } catch (err) {
      console.error('Error loading availability:', err);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setSaving(true);
    try {
      await supabase
        .from('subcontractor_availability')
        .delete()
        .eq('user_id', currentUser.id);

      if (selectedDates.length > 0) {
        const records = selectedDates.map(date => ({
          user_id: currentUser.id,
          date: date.toISOString().split('T')[0],
          description: description.trim() || null
        }));

        const { error: insertError } = await supabase
          .from('subcontractor_availability')
          .insert(records);

        if (insertError) throw insertError;

        await notifyContractorsAboutAvailability(currentUser, selectedDates);
      }

      const { error: userError } = await supabase
        .from('users')
        .update({
          availability_description: description.trim()
        })
        .eq('id', currentUser.id);

      if (userError) throw userError;

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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) {
    return <UnauthorizedAccess redirectTo="/login" />;
  }

  return (
    <TradeGate>
      <AppLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <PageHeader
              backLink={{ href: '/dashboard' }}
              title="List Subcontracting Dates"
              description="Surface spare capacity and help inform market insights"
            />

            <div className="mt-8 space-y-6">
              <AvailabilityCalendar
                user={currentUser}
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                onUpgrade={handleUpgrade}
              />

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
          </div>
        </div>
      </AppLayout>
    </TradeGate>
  );
}
