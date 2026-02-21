type UserLike =
  | { is_admin?: boolean | null; role?: string | null }
  | null
  | undefined;

export function isAdmin(user: UserLike): boolean {
  return !!user && user.is_admin === true;
}
