type UserLike =
  | { is_admin?: boolean | null; role?: string | null }
  | null
  | undefined;

export function isAdmin(user: UserLike): boolean {
  if (!user) return false;
  return user.is_admin === true;
}
