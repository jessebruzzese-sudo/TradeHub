'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import { testSanitizeReturnUrl } from '@/lib/abn-utils';
import { UnauthorizedAccess } from '@/components/unauthorized-access';

export default function SecurityTestPage() {
  const { currentUser } = useAuth();
  const [testResults, setTestResults] = useState<any>(null);

  if (!currentUser || currentUser.role !== 'admin') {
    return <UnauthorizedAccess redirectTo="/dashboard" />;
  }

  const runTests = () => {
    const results = testSanitizeReturnUrl();
    setTestResults(results);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <PageHeader
          title="Security Testing"
          description="Test returnUrl sanitization to prevent open redirect vulnerabilities"
        />

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Return URL Sanitization Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button onClick={runTests}>
                    Run Security Tests
                  </Button>
                  {testResults && (
                    <Badge variant={testResults.allPassed ? 'default' : 'destructive'}>
                      {testResults.summary}
                    </Badge>
                  )}
                </div>

                {testResults && (
                  <div className="mt-6 space-y-2">
                    <h3 className="font-semibold text-lg mb-4">Test Results</h3>
                    <div className="space-y-2">
                      {testResults.results.map((test: any, index: number) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            test.passed
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {test.passed ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">{test.name}</p>
                                <div className="mt-1 space-y-1">
                                  <p className="text-xs text-gray-600 font-mono break-all">
                                    <span className="font-semibold">Input:</span>{' '}
                                    {test.input === null
                                      ? 'null'
                                      : test.input === undefined
                                      ? 'undefined'
                                      : `"${test.input}"`}
                                  </p>
                                  <p className="text-xs text-gray-600 font-mono break-all">
                                    <span className="font-semibold">Expected:</span> "{test.expected}"
                                  </p>
                                  <p className={`text-xs font-mono break-all ${
                                    test.passed ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    <span className="font-semibold">Result:</span> "{test.result}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!testResults && (
                  <div className="text-center py-8 text-gray-500">
                    Click "Run Security Tests" to verify returnUrl sanitization
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Implementation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Protection Against:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Open redirect attacks using protocol-relative URLs (//evil.com)</li>
                    <li>Absolute URLs with http:// or https:// schemes</li>
                    <li>URL-encoded bypass attempts (%2F%2Fevil.com)</li>
                    <li>JavaScript protocol injection (javascript:alert(1))</li>
                    <li>Path traversal with @ symbols (/path@example.com)</li>
                    <li>Relative paths without leading slash</li>
                    <li>Null, undefined, and empty values</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Applied To:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li><code className="bg-gray-100 px-1 rounded">/verify-business</code> page (query parameter)</li>
                    <li><code className="bg-gray-100 px-1 rounded">ABNRequiredModal</code> component</li>
                    <li><code className="bg-gray-100 px-1 rounded">getABNGateUrl()</code> helper function</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Default Behavior:</h4>
                  <p className="text-gray-600">
                    All invalid or potentially malicious returnUrl values default to{' '}
                    <code className="bg-gray-100 px-1 rounded">/dashboard</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
