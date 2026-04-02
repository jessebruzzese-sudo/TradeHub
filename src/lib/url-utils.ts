export function sanitizeReturnUrl(url: string | null | undefined, fallback: string = '/dashboard'): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmedUrl = url.trim();

  if (
    trimmedUrl.includes('://') ||
    trimmedUrl.startsWith('//') ||
    trimmedUrl.includes('@') ||
    trimmedUrl.toLowerCase().includes('webcontainer') ||
    trimmedUrl.toLowerCase().includes('local-credentialless') ||
    trimmedUrl.toLowerCase().includes('javascript:') ||
    trimmedUrl.toLowerCase().includes('data:')
  ) {
    return fallback;
  }

  if (!trimmedUrl.startsWith('/')) {
    return fallback;
  }

  try {
    const urlObj = new URL(trimmedUrl, 'http://localhost');
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    return fallback;
  }
}

export function buildLoginUrl(returnUrl?: string | null): string {
  const sanitized = sanitizeReturnUrl(returnUrl);
  if (sanitized === '/dashboard') {
    return '/login';
  }
  return `/login?returnUrl=${encodeURIComponent(sanitized)}`;
}

/** Public profile URL for viewing another member (not `/profile`, which is the signed-in user’s own page). */
export function getPublicProfileHref(userId: string): string {
  const id = String(userId ?? '').trim();
  if (!id) return '/';
  return `/profiles/${id}`;
}
