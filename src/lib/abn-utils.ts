const DEFAULT_RETURN_URL = '/dashboard';

/** Structural type covering both User (types.ts) and CurrentUser (auth-context). */
export type ABNUser = {
  abn?: string | null;
  abnStatus?: string | null;
  abn_status?: string | null;
  abn_verified_at?: string | null;
  abnVerifiedAt?: string | null;
  abn_verified?: boolean | null;
  abnVerified?: boolean | null;
  abnRejectionReason?: string | null;
  abn_rejection_reason?: string | null;
};

/** Alias for hasValidABN — use for "is this user ABN verified?" checks. */
export function isAbnVerified(user: ABNUser | null): boolean {
  return hasValidABN(user);
}

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

export function hasValidABN(user: ABNUser | null): boolean {
  if (!user) return false;
  const abn = user.abn ?? '';
  if (!abn || String(abn).trim().length === 0) return false;
  const status = String(user.abnStatus ?? user.abn_status ?? '').trim().toUpperCase();
  if (status === 'VERIFIED') return true;
  if (user.abn_verified_at ?? user.abnVerifiedAt) return true;
  if (user.abn_verified === true || user.abnVerified === true) return true;
  return false;
}

export function hasABNButNotVerified(user: ABNUser | null): boolean {
  if (!user) return false;
  const abn = user.abn ?? '';
  if (!abn || String(abn).trim().length === 0) return false;
  const status = String(user.abnStatus ?? user.abn_status ?? '').trim().toUpperCase();
  return status !== 'VERIFIED' && !(user.abn_verified_at ?? user.abnVerifiedAt) && !(user.abn_verified === true || user.abnVerified === true);
}

/** Returns normalized ABN status (VERIFIED, PENDING, REJECTED, UNVERIFIED). */
export function getABNStatus(user: ABNUser | null): string {
  if (!user) return '';
  return String(user.abnStatus ?? user.abn_status ?? '').trim().toUpperCase() || 'UNVERIFIED';
}

export function getABNStatusMessage(
  user: {
    abn?: string | null;
    abn_status?: string | null;
    abnStatus?: string | null;
    abn_rejection_reason?: string | null;
    abnRejectionReason?: string | null;
    name?: string | null;
  } | null
): string | null {
  if (!user) return null;
  if (!user.abn || user.abn.trim().length === 0) {
    return 'You need to provide your ABN before posting jobs.';
  }
  const status = String(user.abnStatus ?? user.abn_status ?? '').toUpperCase();
  if (!status || status === 'UNVERIFIED') {
    return 'Your ABN has been submitted and is pending verification.';
  }
  if (status === 'PENDING') {
    return 'Your ABN is currently being verified by our team.';
  }
  if (status === 'REJECTED') {
    const reason = user.abnRejectionReason ?? user.abn_rejection_reason;
    return `Your ABN verification was rejected${reason ? ': ' + reason : '.'}`;
  }
  return null;
}

export function getABNGateUrl(returnUrl: string): string {
  const sanitizedUrl = sanitizeReturnUrl(returnUrl);
  return `/verify-business?returnUrl=${encodeURIComponent(sanitizedUrl)}`;
}

export function checkABNRequirement(user: ABNUser | null): { hasABN: boolean; gateUrl: string } {
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
    { input: '/jobs/123', expected: '/jobs/123', name: 'Valid job path' },
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
