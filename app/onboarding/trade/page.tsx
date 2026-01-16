'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function TradeOnboardingPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [selectedTrade, setSelectedTrade] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedTrade) {
      setError('Please select a primary trade to continue.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await updateUser({ primaryTrade: selectedTrade });

      if (user?.role === 'contractor') {
        router.push('/dashboard/contractor');
      } else if (user?.role === 'subcontractor') {
        router.push('/dashboard/subcontractor');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('Failed to save your trade selection. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getDashboardPath = () => {
    if (user?.role === 'contractor') return '/dashboard/contractor';
    if (user?.role === 'subcontractor') return '/dashboard/subcontractor';
    if (user?.role === 'admin') return '/admin';
    return '/';
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center py-8 pb-8">
      <div className="w-full px-4 sm:px-6 flex justify-center">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="space-y-4 p-5 sm:p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="w-fit -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Choose your primary trade</CardTitle>
            <CardDescription className="text-base">
              This determines the jobs and tenders you'll see. Primary trade can't be changed after setup. Premium users can add additional trades.
            </CardDescription>
          </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5 sm:p-6 pt-0">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <RadioGroup value={selectedTrade} onValueChange={setSelectedTrade}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto p-1">
              {TRADE_CATEGORIES.map((trade) => (
                <div key={trade} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-slate-50 transition-colors">
                  <RadioGroupItem value={trade} id={trade} />
                  <Label htmlFor={trade} className="flex-1 cursor-pointer font-normal">
                    {trade}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Button>
            <div className="text-center">
              <Link
                href={getDashboardPath()}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Return to dashboard
              </Link>
            </div>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
