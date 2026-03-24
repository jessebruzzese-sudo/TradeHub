type UserLike =
  | { is_admin?: boolean | null; role?: string | null }
  | null
  | undefined;

export function isAdmin(user: UserLike): boolean {
  if (!user) return false;
  if (user.is_admin === true) return true;
  return String(user.role || '').trim().toLowerCase() === 'admin';
}
