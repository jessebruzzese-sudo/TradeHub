/**
 * Centralized admin check.
 * Role is NOT used for any other permissions; admin only via this helper.
 */

type UserLike = { role?: string | null } | null | undefined;

export function isAdmin(user: UserLike): boolean {
  return !!user && user.role === 'admin';
}
