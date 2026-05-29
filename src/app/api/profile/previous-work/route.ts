import { NextResponse } from 'next/server';
import { ensurePublicUserRow } from '@/lib/ensure-public-user-server';
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

export async function GET(req: Request) {
  return NextResponse.json({ id: "TODO" }, { status: 200 });
}

export async function POST(req: Request) {
  return NextResponse.json({ id: "TODO" }, { status: 201 });
}
