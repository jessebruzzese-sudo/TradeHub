import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import type { PreviousWorkListItem, PreviousWorkOwnerSummary } from '@/lib/previous-work';
import { isPreviousWorkStorageObjectKey, isUuidString, PREVIOUS_WORK_STORAGE_BUCKET } from '@/lib/previous-work';
import {
  canViewPreviousWorkPortfolio,
  displayNameForPreviousWorkOwner,
  signPreviousWorkImageUrls,
} from '@/lib/previous-work-server';
import { refreshProfileStrength } from '@/lib/profile-strength';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  }
  if (!isUuidString(id)) {
    return NextResponse.json({ error: 'Invalid project id.' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceSupabase();
  const { data: workRow, error: workErr } = await admin
    .from('previous_work')
    .select(
      `
      id,
      user_id,
      title,
      caption,
      location,
      created_at,
      previous_work_images ( id, image_path, sort_order )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (workErr || !workRow) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const ownerUserId = (workRow as { user_id: string }).user_id;
  const gate = await canViewPreviousWorkPortfolio(ownerUserId, user?.id ?? null);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const { data: ownerRow, error: ownerErr } = await admin
    .from('users')
    .select('id, name, business_name, primary_trade, avatar, show_business_name_on_profile')
    .eq('id', ownerUserId)
    .maybeSingle();

  if (ownerErr || !ownerRow) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  const imgs = ((workRow as any).previous_work_images ?? []) as {
    id: string;
    image_path: string;
    sort_order: number;
  }[];
  imgs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const paths = imgs.map((im) => im.image_path).filter(Boolean);
  const urlByPath = await signPreviousWorkImageUrls(paths, ownerUserId);

  const rawTitle = (workRow as any).title;
  const item: PreviousWorkListItem = {
    id: (workRow as any).id,
    title: typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : 'Completed work',
    caption: (workRow as any).caption,
    location: (workRow as any).location ?? null,
    created_at: (workRow as any).created_at,
    images: imgs
      .map((im) => ({
        id: im.id,
        sort_order: im.sort_order,
        url: urlByPath.get(im.image_path) ?? '',
      }))
      .filter((x) => x.url),
  };

  if (item.images.length === 0) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }

  const owner: PreviousWorkOwnerSummary = {
    id: ownerRow.id,
    displayName: displayNameForPreviousWorkOwner(ownerRow),
    primaryTrade: ownerRow.primary_trade ?? null,
    avatar: ownerRow.avatar ?? null,
  };

  return NextResponse.json({ item, owner });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  }
  if (!isUuidString(id)) {
    return NextResponse.json({ error: 'Invalid project id.' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'You need to be signed in.' }, { status: 401 });
  }

  const admin = createServiceSupabase();

  const { data: row, error: fetchErr } = await admin
    .from('previous_work')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const { data: imgs, error: imgErr } = await admin
    .from('previous_work_images')
    .select('image_path')
    .eq('previous_work_id', id);

  if (imgErr) {
    console.error('[previous-work DELETE images]', imgErr);
    return NextResponse.json({ error: 'Could not remove project.' }, { status: 500 });
  }

  const rawPaths = (imgs ?? []).map((r: { image_path: string }) => r.image_path).filter(Boolean);
  const paths = rawPaths.filter((path) => isPreviousWorkStorageObjectKey(path, user.id, id));
  if (rawPaths.length && paths.length < rawPaths.length) {
    console.error('[previous-work DELETE] rejected unsafe storage paths');
    return NextResponse.json({ error: 'Could not remove project safely.' }, { status: 500 });
  }
  if (paths.length) {
    const { error: rmErr } = await admin.storage.from(PREVIOUS_WORK_STORAGE_BUCKET).remove(paths);
    if (rmErr) {
      console.error('[previous-work DELETE storage]', rmErr);
      return NextResponse.json(
        { error: 'Could not remove files from storage. Try again in a moment.' },
        { status: 503 }
      );
    }
  }

  const { error: delErr } = await admin.from('previous_work').delete().eq('id', id).eq('user_id', user.id);
  if (delErr) {
    console.error('[previous-work DELETE row]', delErr);
    return NextResponse.json({ error: 'Could not remove project.' }, { status: 500 });
  }

  await refreshProfileStrength(user.id);
  return NextResponse.json({ ok: true });
}
