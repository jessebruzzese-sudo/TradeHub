'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/app-nav';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, PlayCircle, Loader2, AlertTriangle } from 'lucide-react';
import { runAllQATests, QATestResult } from '@/lib/qa-test-utils';
import { UnauthorizedAccess } from '@/components/unauthorized-access';

export default function QATestsPage() {
  const { currentUser } = useAuth();
  const [testResults, setTestResults] = useState<QATestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [allPassed, setAllPassed] = useState<boolean>(false);

  if (!currentUser || currentUser.role !== 'admin') {
    return <UnauthorizedAccess redirectTo="/dashboard" />;
  }

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    setSummary('');

    try {
      const results = await runAllQATests();
      setTestResults(results.results);
      setSummary(results.summary);
      setAllPassed(results.allPassed);
    } catch (error: any) {
      setTestResults([
        {
          name: 'Test Execution',
          description: 'Run all QA tests',
          passed: false,
          expected: 'Successful execution',
          actual: `Error: ${error.message}`,
          error: error.message,
        },
      ]);
      setSummary('Test execution failed');
      setAllPassed(false);
    } finally {
      setIsRunning(false);
    }
  };

  const getTestCategoryResults = (category: string) => {
    if (!testResults) return [];
    return testResults.filter((t) => t.name.startsWith(category));
  };

  const renderTestCategory = (category: string, title: string, description: string) => {
    const categoryResults = getTestCategoryResults(category);
    if (categoryResults.length === 0) return null;

    const categoryPassed = categoryResults.every((r) => r.passed);
    const passedCount = categoryResults.filter((r) => r.passed).length;

    return (
      <Card key={category}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Badge variant={categoryPassed ? 'default' : 'destructive'}>
              {passedCount}/{categoryResults.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categoryResults.map((test, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  test.passed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {test.passed ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{test.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{test.description}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs">
                        <span className="font-semibold text-gray-700">Expected:</span>{' '}
                        <span className="text-gray-600">{test.expected}</span>
                      </p>
                      <p className="text-xs">
                        <span className="font-semibold text-gray-700">Actual:</span>{' '}
                        <span className={test.passed ? 'text-green-700' : 'text-red-700'}>
                          {test.actual}
                        </span>
                      </p>
                      {test.error && (
                        <p className="text-xs text-red-600 mt-1">
                          <span className="font-semibold">Error:</span> {test.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <PageHeader
          title="QA Test Runner"
          description="Automated testing for tender system, trade matching, and quote validation"
        />

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Suite</CardTitle>
              <CardDescription>
                Run comprehensive tests to validate tender system functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button onClick={runTests} disabled={isRunning}>
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Tests...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Run All Tests
                      </>
                    )}
                  </Button>
                  {summary && (
                    <Badge
                      variant={allPassed ? 'default' : 'destructive'}
                      className="text-sm px-3 py-1"
                    >
                      {summary}
                    </Badge>
                  )}
                </div>

                {!testResults && !isRunning && (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Click "Run All Tests" to validate system functionality</p>
                  </div>
                )}

                {isRunning && (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-blue-600" />
                    <p className="text-gray-600">Running automated tests...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {testResults && (
            <div className="space-y-4">
              {renderTestCategory('Test Setup', 'Test Environment Setup', 'Verify test tenders and users creation')}
              {renderTestCategory('Trade Matching', 'Trade Matching Logic', 'Validate trade requirement matching using production logic')}
              {renderTestCategory('Trade Sub-Description', 'Trade-Specific Descriptions', 'Verify each trade has unique sub-description text')}
              {renderTestCategory('ABN Gating', 'ABN Requirement Validation', 'Test ABN gating for quote submissions')}
              {renderTestCategory('Limited Quotes', 'Limited Quotes Enforcement', 'Test role-agnostic quote submission restrictions')}
              {renderTestCategory('Budget Range', 'Budget Range Validation', 'Verify trade-specific budget ranges are properly set')}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Test Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Test Environment Setup</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Two test tenders: limited (quotes restricted) and open (quotes allowed)</li>
                    <li>Two test users: one with ABN, one without ABN</li>
                    <li>Deterministic IDs for repeatability</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Trade Matching Tests</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Uses same production logic as tender list page</li>
                    <li>Electrician matches tender requirements → true</li>
                    <li>Plumber matches tender requirements → true</li>
                    <li>Carpenter matches tender requirements → false</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Trade Description Tests</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>getTradeSubDescription("Electrician") returns Electrician-specific text</li>
                    <li>getTradeSubDescription("Plumber") returns Plumber-specific text</li>
                    <li>Carpenter has no description (not in requirements)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">ABN Gating Tests</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>User without ABN is blocked from quote submission</li>
                    <li>User with ABN is allowed on open tenders</li>
                    <li>ABN validation enforced in edge function</li>
                    <li>Core business requirement for all quote submissions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Limited Quotes Tests (Role-Agnostic)</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>limited_quotes_enabled=true blocks ALL business users</li>
                    <li>limited_quotes_enabled=false allows users with ABN</li>
                    <li>No contractor/subcontractor role distinction</li>
                    <li>Unified Trade Business model enforcement</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Budget Range Tests</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Each trade has min and max budget values</li>
                    <li>Budget ranges are valid (min ≤ max)</li>
                    <li>Values are stored in cents for precision</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>✓ Admin-only route with authorization guard</p>
                <p>✓ Test tenders and users use fixed IDs for repeatability</p>
                <p>✓ No sensitive user data exposed in test results</p>
                <p>✓ Safe labels used (QA User A/B instead of actual IDs)</p>
                <p>✓ Tests are read-only except for test data creation</p>
                <p>✓ Test users created server-side with safe email addresses</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
