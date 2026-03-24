import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server';
import {
  extForImageMime,
  isPreviousWorkStorageObjectKey,
  isUuidString,
  normalizePreviousWorkCaption,
  normalizePreviousWorkLocation,
  normalizePreviousWorkTitle,
  PREVIOUS_WORK_ALLOWED_MIME,
  PREVIOUS_WORK_MAX_BYTES_PER_IMAGE,
  PREVIOUS_WORK_MAX_IMAGES,
  PREVIOUS_WORK_STORAGE_BUCKET,
  type PreviousWorkListItem,
} from '@/lib/previous-work';
import { canViewPreviousWorkPortfolio, signPreviousWorkImageUrls } from '@/lib/previous-work-server';
import { refreshProfileStrength } from '@/lib/profile-strength';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Set `DEBUG_PREVIOUS_WORK_CREATE=1` to log Completed Works POST steps (remove after debugging). */
function debugPreviousWorkCreate(): boolean {
  const v = process.env.DEBUG_PREVIOUS_WORK_CREATE;
  return v === '1' || v === 'true';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('userId')?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });
  }
  if (!isUuidString(targetUserId)) {
    return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const gate = await canViewPreviousWorkPortfolio(targetUserId, user?.id ?? null);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.status });
  }

  const admin = createServiceSupabase();
  const { data: rows, error } = await admin
    .from('previous_work')
    .select(
      `
      id,
      title,
      caption,
      location,
      created_at,
      previous_work_images ( id, image_path, sort_order )
    `
    )
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[previous-work GET]', error);
    return NextResponse.json({ error: 'Could not load portfolio.' }, { status: 500 });
  }

  const allPaths: string[] = [];
  for (const r of rows ?? []) {
    const imgs = (r as any).previous_work_images as { id: string; image_path: string; sort_order: number }[] | null;
    for (const im of imgs ?? []) {
      if (im?.image_path) allPaths.push(im.image_path);
    }
  }
  const urlByPath = await signPreviousWorkImageUrls(allPaths, targetUserId);

  const items: PreviousWorkListItem[] = (rows ?? []).map((r: any) => {
    const imgs = (r.previous_work_images ?? []) as { id: string; image_path: string; sort_order: number }[];
    imgs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return {
      id: r.id,
      title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : 'Completed work',
      caption: r.caption,
      location: r.location ?? null,
      created_at: r.created_at,
      images: imgs
        .map((im) => ({
          id: im.id,
          sort_order: im.sort_order,
          url: urlByPath.get(im.image_path) ?? '',
        }))
        .filter((x) => x.url),
    };
  })
    .filter((item) => item.images.length > 0);

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'You need to be signed in.' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const titleRaw = form.get('title');
  const captionRaw = form.get('caption');
  const locationRaw = form.get('location');
  const ttl = normalizePreviousWorkTitle(titleRaw);
  if (!ttl.ok) return NextResponse.json({ error: ttl.error }, { status: 400 });
  const cap = normalizePreviousWorkCaption(captionRaw);
  if (!cap.ok) return NextResponse.json({ error: cap.error }, { status: 400 });
  const loc = normalizePreviousWorkLocation(locationRaw);
  if (!loc.ok) return NextResponse.json({ error: loc.error }, { status: 400 });

  const files = form.getAll('images').filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: 'Add at least one image (up to 5).' }, { status: 400 });
  }
  if (files.length > PREVIOUS_WORK_MAX_IMAGES) {
    return NextResponse.json({ error: `You can upload at most ${PREVIOUS_WORK_MAX_IMAGES} images per project.` }, { status: 400 });
  }

  for (const f of files) {
    if (f.size > PREVIOUS_WORK_MAX_BYTES_PER_IMAGE) {
      return NextResponse.json({ error: 'Each image must be 10MB or smaller.' }, { status: 400 });
    }
    const mime = (f.type || '').toLowerCase();
    if (!PREVIOUS_WORK_ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, GIF, or WebP images are allowed.' }, { status: 400 });
    }
  }

  const dbg = debugPreviousWorkCreate();
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (dbg) {
    console.log('[previous-work-create]', {
      bucket: PREVIOUS_WORK_STORAGE_BUCKET,
      hasServiceRoleKey: Boolean(sr && String(sr).length > 20),
      userId: user.id,
      imageCount: files.length,
    });
  }

  const admin = createServiceSupabase();
  let lastOp = 'previous_work.insert';

  const { data: inserted, error: insErr } = await admin
    .from('previous_work')
    .insert({
      user_id: user.id,
      title: ttl.value,
      caption: cap.value,
      location: loc.value,
    })
    .select('id')
    .single();

  if (insErr || !inserted?.id) {
    if (dbg) console.error('[previous-work-create] previous_work insert failed', { lastOp, insErr });
    console.error('[previous-work POST insert]', insErr);
    return NextResponse.json({ error: 'Could not save project.' }, { status: 500 });
  }

  const workId = inserted.id as string;
  if (dbg) console.log('[previous-work-create] previous_work insert ok', { workId });

  const uploadedPaths: string[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const mime = (f.type || '').toLowerCase();
      const ext = extForImageMime(mime);
      const path = `${user.id}/${workId}/${crypto.randomUUID()}.${ext}`;
      const keyOk = isPreviousWorkStorageObjectKey(path, user.id, workId);
      if (dbg) {
        console.log('[previous-work-create] path check', {
          index: i,
          keyValid: keyOk,
          pathSample: path.slice(0, 80),
        });
      }
      if (!keyOk) {
        throw new Error('invalid storage path shape (internal)');
      }

      lastOp = `storage.upload[${i}]`;
      const buf = Buffer.from(await f.arrayBuffer());
      if (dbg) console.log('[previous-work-create] storage upload start', { lastOp, bytes: buf.length });
      const { error: upErr } = await admin.storage.from(PREVIOUS_WORK_STORAGE_BUCKET).upload(path, buf, {
        contentType: mime,
        upsert: false,
      });
      if (upErr) {
        if (dbg) console.error('[previous-work-create] storage upload error', { lastOp, upErr });
        throw upErr;
      }
      if (dbg) console.log('[previous-work-create] storage upload ok', { lastOp });
      uploadedPaths.push(path);

      lastOp = `previous_work_images.insert[${i}]`;
      if (dbg) console.log('[previous-work-create] previous_work_images insert start', { lastOp, pathSample: path.slice(0, 80) });
      const { error: imgErr } = await admin.from('previous_work_images').insert({
        previous_work_id: workId,
        image_path: path,
        sort_order: i,
      });
      if (imgErr) {
        if (dbg) console.error('[previous-work-create] previous_work_images insert failed', { lastOp, imgErr });
        throw imgErr;
      }
      if (dbg) console.log('[previous-work-create] previous_work_images insert ok', { lastOp });
    }
  } catch (e) {
    if (dbg) console.error('[previous-work-create] FAILED', { lastOp, err: e });
    console.error('[previous-work POST upload]', e);
    if (uploadedPaths.length) {
      if (dbg) console.log('[previous-work-create] cleanup: storage.remove', { paths: uploadedPaths.length });
      const { error: rmErr } = await admin.storage.from(PREVIOUS_WORK_STORAGE_BUCKET).remove(uploadedPaths);
      if (dbg && rmErr) console.error('[previous-work-create] cleanup storage.remove error', rmErr);
    }
    if (dbg) console.log('[previous-work-create] cleanup: previous_work.delete', { workId });
    await admin.from('previous_work').delete().eq('id', workId);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }

  if (dbg) console.log('[previous-work-create] POST complete', { workId, images: uploadedPaths.length });

  await refreshProfileStrength(user.id);
  return NextResponse.json({ id: workId }, { status: 201 });
}
