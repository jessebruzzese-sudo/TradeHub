import { User } from './types';

const DEFAULT_RETURN_URL = '/dashboard';

export function sanitizeReturnUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return DEFAULT_RETURN_URL;
  }

  const trimmed = url.trim();

  if (trimmed.startsWith('//')) {
    return DEFAULT_RETURN_URL;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return DEFAULT_RETURN_URL;
  }

  if (trimmed.includes('@')) {
    return DEFAULT_RETURN_URL;
  }

  if (!trimmed.startsWith('/')) {
    return DEFAULT_RETURN_URL;
  }

  try {
    const decodedUrl = decodeURIComponent(trimmed);

    if (decodedUrl.startsWith('//')) {
      return DEFAULT_RETURN_URL;
    }

    if (decodedUrl.includes('://')) {
      return DEFAULT_RETURN_URL;
    }

    if (decodedUrl.includes('@')) {
      return DEFAULT_RETURN_URL;
    }

    return decodedUrl;
  } catch (e) {
    return DEFAULT_RETURN_URL;
  }
}

export function hasValidABN(user: User | null): boolean {
  if (!user) return false;
  if (!user.abn || user.abn.trim().length === 0) return false;
  return user.abnStatus === 'VERIFIED';
}

export function hasABNButNotVerified(user: User | null): boolean {
  if (!user) return false;
  if (!user.abn || user.abn.trim().length === 0) return false;
  return user.abnStatus !== 'VERIFIED';
}

export function getABNStatusMessage(user: User | null): string | null {
  if (!user) return null;
  if (!user.abn || user.abn.trim().length === 0) {
    return 'You need to provide your ABN before posting jobs.';
  }
  if (!user.abnStatus || user.abnStatus === 'UNVERIFIED') {
    return 'Your ABN has been submitted and is pending verification.';
  }
  if (user.abnStatus === 'PENDING') {
    return 'Your ABN is currently being verified by our team.';
  }
  if (user.abnStatus === 'REJECTED') {
    return `Your ABN verification was rejected${user.abnRejectionReason ? ': ' + user.abnRejectionReason : '.'}`;
  }
  return null;
}

export function getABNGateUrl(returnUrl: string): string {
  const sanitizedUrl = sanitizeReturnUrl(returnUrl);
  return `/verify-business?returnUrl=${encodeURIComponent(sanitizedUrl)}`;
}

export function checkABNRequirement(user: User | null): { hasABN: boolean; gateUrl: string } {
  const hasABN = hasValidABN(user);
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const gateUrl = getABNGateUrl(currentPath);

  return { hasABN, gateUrl };
}

export function testSanitizeReturnUrl() {
  const tests = [
    { input: '/jobs/create', expected: '/jobs/create', name: 'Valid internal path' },
    { input: '//example.com', expected: '/dashboard', name: 'Protocol-relative URL' },
    { input: 'https://example.com', expected: '/dashboard', name: 'HTTPS URL' },
    { input: 'http://example.com', expected: '/dashboard', name: 'HTTP URL' },
    { input: '//evil.com/path', expected: '/dashboard', name: 'Protocol-relative with path' },
    { input: '/profile/edit', expected: '/profile/edit', name: 'Valid profile path' },
    { input: 'javascript:alert(1)', expected: '/dashboard', name: 'JavaScript protocol' },
    { input: '/path@example.com', expected: '/dashboard', name: 'Path with @ symbol' },
    { input: '', expected: '/dashboard', name: 'Empty string' },
    { input: null, expected: '/dashboard', name: 'Null value' },
    { input: undefined, expected: '/dashboard', name: 'Undefined value' },
    { input: 'relative/path', expected: '/dashboard', name: 'Relative path without leading slash' },
    { input: '%2F%2Fevil.com', expected: '/dashboard', name: 'URL-encoded protocol-relative' },
    { input: '/%2F/evil.com', expected: '/dashboard', name: 'Encoded slash after slash' },
    { input: '/tenders/123', expected: '/tenders/123', name: 'Valid tender path' },
  ];

  const results = tests.map(test => {
    const result = sanitizeReturnUrl(test.input as any);
    const passed = result === test.expected;
    return {
      ...test,
      result,
      passed,
    };
  });

  const allPassed = results.every(r => r.passed);

  return {
    allPassed,
    results,
    summary: `${results.filter(r => r.passed).length}/${results.length} tests passed`,
  };
}
