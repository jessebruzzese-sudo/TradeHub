'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

interface SetupResult {
  email: string;
  status: 'created' | 'already_exists' | 'reset' | 'error';
  userId?: string;
  primaryTrade?: string;
  error?: string;
}

interface SetupResponse {
  success: boolean;
  message?: string;
  results?: SetupResult[];
  error?: string;
}

export default function QASetupPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SetupResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setupTestAccounts = async (reset: boolean = false) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/setup-qa-test-accounts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reset }),
        }
      );

      const data: SetupResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to setup test accounts');
      }

      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'reset':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'already_exists':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return <Badge className="bg-green-100 text-green-800">Created</Badge>;
      case 'reset':
        return <Badge className="bg-green-100 text-green-800">Reset</Badge>;
      case 'already_exists':
        return <Badge className="bg-blue-100 text-blue-800">Already Exists</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        backLink={{ href: '/admin' }}
        title="QA Test Account Setup"
        description="Create test accounts for QA testing of trade-based visibility"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Setup QA Test Accounts</CardTitle>
            <CardDescription>
              This will create four test subcontractor accounts with fixed primary trades for QA testing.
              These accounts have primary_trade locked (same rules as production) and can be logged into normally.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Test Accounts to be Created:</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>
                  <strong>Electrician:</strong> test+electrician@tradebid.com.au
                  <br />
                  <span className="text-xs">Password: password</span>
                </li>
                <li>
                  <strong>Plumber:</strong> test+plumber@tradebid.com.au
                  <br />
                  <span className="text-xs">Password: password</span>
                </li>
                <li>
                  <strong>Carpenter:</strong> test+carpenter@tradebid.com.au
                  <br />
                  <span className="text-xs">Password: password</span>
                </li>
                <li>
                  <strong>Painter & Decorator:</strong> test+painter@tradebid.com.au
                  <br />
                  <span className="text-xs">Password: password</span>
                </li>
              </ul>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Setup:</strong> Creates accounts if they don't exist. Safe to run multiple times.
                <br />
                <strong>Reset:</strong> Updates passwords to "password" for existing accounts. Use this if accounts can't log in.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={() => setupTestAccounts(false)}
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Setup Test Accounts'
                )}
              </Button>
              <Button
                onClick={() => setupTestAccounts(true)}
                disabled={loading}
                size="lg"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Test Accounts'
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {results && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Setup Results:</h3>
                {results.map((result, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getStatusIcon(result.status)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-gray-900">{result.email}</p>
                              {getStatusBadge(result.status)}
                            </div>
                            {result.primaryTrade && (
                              <p className="text-sm text-gray-600">
                                Primary Trade: {result.primaryTrade}
                              </p>
                            )}
                            {result.userId && (
                              <p className="text-xs text-gray-500 mt-1">
                                User ID: {result.userId}
                              </p>
                            )}
                            {result.error && (
                              <p className="text-sm text-red-600 mt-1">
                                Error: {result.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {results && (
              <Alert>
                <AlertDescription>
                  <strong>Next Steps:</strong> You can now log in with any of these accounts using
                  the credentials shown above. Each account will only see tenders matching their
                  primary trade.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
