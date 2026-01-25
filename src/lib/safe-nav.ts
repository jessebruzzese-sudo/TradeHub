export function getSafeReturnUrl(raw: unknown, fallback: string): string {
  if (!raw || typeof raw !== 'string') {
    return fallback;
  }

  const trimmed = raw.trim();

  if (
    trimmed.includes('http:') ||
    trimmed.includes('https:') ||
    trimmed.includes('://') ||
    trimmed.startsWith('//') ||
    trimmed.includes('@') ||
    trimmed.toLowerCase().includes('webcontainer') ||
    trimmed.toLowerCase().includes('local-credentialless') ||
    trimmed.toLowerCase().includes('javascript:') ||
    trimmed.toLowerCase().includes('data:') ||
    trimmed.toLowerCase().includes('file:') ||
    trimmed.toLowerCase().includes('blob:')
  ) {
    console.warn(`[safe-nav] Blocked unsafe URL: ${trimmed.substring(0, 100)}`);
    return fallback;
  }

  if (!trimmed.startsWith('/')) {
    console.warn(`[safe-nav] Blocked non-relative URL: ${trimmed.substring(0, 100)}`);
    return fallback;
  }

  try {
    const urlObj = new URL(trimmed, 'http://localhost');
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch (error) {
    console.warn(`[safe-nav] Failed to parse URL: ${trimmed.substring(0, 100)}`);
    return fallback;
  }
}

export function hardRedirect(path: string): void {
  const safePath = getSafeReturnUrl(path, '/');
  console.log(`[safe-nav] Hard redirect to: ${safePath}`);
  window.location.replace(safePath);
}

export function safeRouterPush(router: any, path: string, fallback: string = '/'): void {
  const safePath = getSafeReturnUrl(path, fallback);
  console.log(`[safe-nav] Router push to: ${safePath}`);

  try {
    router.push(safePath);
  } catch (error) {
    console.warn(`[safe-nav] Router push failed, using hard redirect`, error);
    hardRedirect(safePath);
  }
}

export function safeRouterReplace(router: any, path: string, fallback: string = '/'): void {
  const safePath = getSafeReturnUrl(path, fallback);
  console.log(`[safe-nav] Router replace to: ${safePath}`);

  try {
    router.replace(safePath);
  } catch (error) {
    console.warn(`[safe-nav] Router replace failed, using hard redirect`, error);
    hardRedirect(safePath);
  }
}
