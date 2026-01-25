'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Bell, Mail, Smartphone, Info, Megaphone } from 'lucide-react';
import { User } from '@/lib/types';
import { canUseAvailabilityBroadcast, validateWorkAlerts } from '@/lib/subscription-utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AlertSettingsProps {
  user: User;
  onUpdate: (field: string, value: boolean) => void;
  onUpgrade?: () => void;
}

export function AlertSettings({ user, onUpdate, onUpgrade }: AlertSettingsProps) {
  const canBroadcast = canUseAvailabilityBroadcast(user);

  const workAlertsEnabled = user.subcontractorWorkAlertsEnabled ?? true;
  const workAlertInApp = user.subcontractorWorkAlertInApp ?? true;
  const workAlertEmail = user.subcontractorWorkAlertEmail ?? true;
  const workAlertSms = user.subcontractorWorkAlertSms ?? true;
  const availabilityBroadcastEnabled = user.subcontractorAvailabilityBroadcastEnabled ?? false;

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleWorkAlertChannelChange = (channel: string, checked: boolean) => {
    const newInApp = channel === 'subcontractorWorkAlertInApp' ? checked : workAlertInApp;
    const newEmail = channel === 'subcontractorWorkAlertEmail' ? checked : workAlertEmail;
    const newSms = channel === 'subcontractorWorkAlertSms' ? checked : workAlertSms;

    const validation = validateWorkAlerts(newInApp, newEmail, newSms);
    if (!validation.valid) {
      setValidationError(validation.message || null);
      return;
    }

    setValidationError(null);
    onUpdate(channel, checked);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Work Alerts
          </CardTitle>
          <CardDescription>
            Get notified when contractors post matching work near you. Available to all users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Enable Work Alerts</Label>
              <p className="text-sm text-gray-500">
                Master toggle for new work notifications
              </p>
            </div>
            <Switch
              checked={workAlertsEnabled}
              onCheckedChange={(checked) => onUpdate('subcontractorWorkAlertsEnabled', checked)}
            />
          </div>

          {workAlertsEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <div>
                    <Label className="text-sm font-medium">In-App Notifications</Label>
                    <p className="text-xs text-gray-500">
                      Receive notifications within TradeHub
                    </p>
                  </div>
                </div>
                <Switch
                  checked={workAlertInApp}
                  onCheckedChange={(checked) => handleWorkAlertChannelChange('subcontractorWorkAlertInApp', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div>
                    <Label className="text-sm font-medium">Email Alerts</Label>
                    <p className="text-xs text-gray-500">
                      Receive work alerts via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={workAlertEmail}
                  onCheckedChange={(checked) => handleWorkAlertChannelChange('subcontractorWorkAlertEmail', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  <div>
                    <Label className="text-sm font-medium">SMS Alerts</Label>
                    <p className="text-xs text-gray-500">
                      Receive work alerts via text message
                    </p>
                  </div>
                </div>
                <Switch
                  checked={workAlertSms}
                  onCheckedChange={(checked) => handleWorkAlertChannelChange('subcontractorWorkAlertSms', checked)}
                />
              </div>

              {validationError && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-sm text-red-900">
                    {validationError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Work alerts are available to all users (Free and Pro). You can choose any combination of in-app, email, or SMS notifications.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Subcontracting Dates Notifications
            {!canBroadcast && (
              <span className="text-xs font-normal text-gray-500 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Premium Only
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Alert contractors when you list subcontracting dates. Premium feature only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className={`text-base font-medium ${!canBroadcast ? 'text-gray-400' : ''}`}>
                Enable Availability Notifications
              </Label>
              <p className="text-sm text-gray-500">
                Notify local contractors when you list available dates
              </p>
            </div>
            {canBroadcast ? (
              <Switch
                checked={availabilityBroadcastEnabled}
                onCheckedChange={(checked) => onUpdate('subcontractorAvailabilityBroadcastEnabled', checked)}
              />
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Lock className="w-5 h-5 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upgrade to Premium to enable availability notifications</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {!canBroadcast && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Lock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-900">
                Subcontracting dates notifications are a Premium feature.
                <Button
                  variant="link"
                  className="h-auto p-0 ml-1 text-yellow-700 font-medium"
                  onClick={onUpgrade}
                >
                  Upgrade to Premium
                </Button>
                {' '}to notify contractors when you list available subcontracting dates.
              </AlertDescription>
            </Alert>
          )}

          {canBroadcast && availabilityBroadcastEnabled && (
            <Alert className="bg-green-50 border-green-200">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-900">
                When you list subcontracting dates, contractors in your area with matching trade requirements will be notified via their selected alert channels.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
