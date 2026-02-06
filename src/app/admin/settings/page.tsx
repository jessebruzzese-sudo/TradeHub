'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Save, Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase-client';

interface FeatureFlag {
  guest_tenders_enabled: boolean;
  signups_enabled: boolean;
  emails_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [flags, setFlags] = useState<FeatureFlag>({
    guest_tenders_enabled: true,
    signups_enabled: true,
    emails_enabled: true,
    maintenance_mode: false,
    maintenance_message: 'We are performing scheduled maintenance. The platform will be back shortly.',
  });

  const loadSettings = useCallback(async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('admin_settings')
        .select('key, value');

      if (fetchError) throw fetchError;

      if (data) {
        const settingsMap: Partial<FeatureFlag> = {};
        data.forEach((setting: any) => {
          const value = setting.value;
          const key = setting.key as keyof FeatureFlag;
          if (key === 'maintenance_message') {
            settingsMap[key] = typeof value === 'string' ? value : String(value);
          } else if (key in settingsMap || key === 'guest_tenders_enabled' || key === 'signups_enabled' || key === 'emails_enabled' || key === 'maintenance_mode') {
            settingsMap[key] = value === true || value === 'true';
          }
        });
        setFlags((prev) => ({ ...prev, ...settingsMap }));
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updates = Object.entries(flags).map(([key, value]) => ({
        key,
        value: key === 'maintenance_message' ? value : value,
      }));

      for (const update of updates) {
        const { error: updateError } = await (supabase as any)
          .from('admin_settings')
          .update({ value: update.value })
          .eq('key', update.key);

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <PageHeader
          title="System Settings"
          description="Manage system-wide feature flags and settings"
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Settings saved successfully
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>
              Control system-wide features and functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="guest-tenders">Guest Tenders</Label>
                <p className="text-sm text-gray-500">
                  Allow guest users to submit tenders for admin approval
                </p>
              </div>
              <Switch
                id="guest-tenders"
                checked={flags.guest_tenders_enabled}
                onCheckedChange={(checked) =>
                  setFlags((prev) => ({ ...prev, guest_tenders_enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="signups">User Signups</Label>
                <p className="text-sm text-gray-500">
                  Allow new users to register for accounts
                </p>
              </div>
              <Switch
                id="signups"
                checked={flags.signups_enabled}
                onCheckedChange={(checked) =>
                  setFlags((prev) => ({ ...prev, signups_enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emails">Outgoing Emails</Label>
                <p className="text-sm text-gray-500">
                  Enable all outgoing email notifications
                </p>
              </div>
              <Switch
                id="emails"
                checked={flags.emails_enabled}
                onCheckedChange={(checked) =>
                  setFlags((prev) => ({ ...prev, emails_enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance">Maintenance Mode</Label>
                <p className="text-sm text-gray-500">
                  Display maintenance banner to all users
                </p>
              </div>
              <Switch
                id="maintenance"
                checked={flags.maintenance_mode}
                onCheckedChange={(checked) =>
                  setFlags((prev) => ({ ...prev, maintenance_mode: checked }))
                }
              />
            </div>

            {flags.maintenance_mode && (
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="maintenance-message">Maintenance Message</Label>
                <Textarea
                  id="maintenance-message"
                  value={flags.maintenance_message}
                  onChange={(e) =>
                    setFlags((prev) => ({
                      ...prev,
                      maintenance_message: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Enter maintenance message"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
