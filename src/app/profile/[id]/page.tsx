import { redirect } from 'next/navigation';

function serializeSearchParams(sp: Record<string, string | string[] | undefined> | undefined): string {
  if (!sp || Object.keys(sp).length === 0) return '';
  const u = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => u.append(key, String(v)));
    } else {
      u.append(key, String(val));
    }
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

/**
 * Legacy URL: `/profile/[id]` redirects to `/profiles/[id]` (signed-in “my profile” stays `/profile`).
 * Public data is loaded in `src/app/profiles/[id]/page.tsx` via `loadPublicProfileForPage`
 * (`public.users` service-role fallback when `public_profile_directory` returns no row).
 */
export default function LegacyProfileIdRedirect({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const id = params?.id?.trim();
  if (process.env.NODE_ENV === 'development') {
    console.log('profile/[id] legacy redirect params.id (queries run on /profiles/[id])', params.id);
  }
  if (!id) {
    redirect('/profile');
  }
  redirect(`/profiles/${id}${serializeSearchParams(searchParams)}`);
}
