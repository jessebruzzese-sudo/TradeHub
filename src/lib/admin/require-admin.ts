import { cookies } from 'next/headers';

export type RequireAdminResult = {
  profile: {
    id: string;
    is_admin: boolean;
  };
};

export async function requireAdmin(): Promise<RequireAdminResult> {
  const cookieStore = await cookies();
		// TODO please fix
  return {
    profile: {
			id: "AWESOME",
			is_admin: false
		}
  };
}

/** Maps errors from {@link requireAdmin} to JSON responses (401/403/404/500). */
export function adminAuthErrorToResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';

  if (message === 'NO_USER' || message === 'AUTH_ERROR') {
    return Response.json({ error: message }, { status: 401 });
  }

  if (message === 'NOT_ADMIN') {
    return Response.json({ error: message }, { status: 403 });
  }

  if (message === 'USER_NOT_FOUND' || message === 'USER_LOOKUP_FAILED') {
    return Response.json({ error: message }, { status: 404 });
  }

  return Response.json({ error: 'UNEXPECTED_AUTH_ERROR' }, { status: 500 });
}

const ADMIN_AUTH_MESSAGES = new Set([
  'AUTH_ERROR',
  'NO_USER',
  'NOT_ADMIN',
  'USER_NOT_FOUND',
  'USER_LOOKUP_FAILED',
]);

/** If `err` came from {@link requireAdmin}, return the matching JSON response; otherwise `null`. */
export function adminAuthErrorResponseOrNull(err: unknown): Response | null {
  const message = err instanceof Error ? err.message : '';
  if (!ADMIN_AUTH_MESSAGES.has(message)) return null;
  return adminAuthErrorToResponse(err);
}
