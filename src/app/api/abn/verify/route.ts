import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Strip everything that isn't a digit. */
function sanitizeAbn(input: string): string {
  return (input || '').replace(/\D/g, '');
}

/** ABN must be exactly 11 digits. */
function isValidAbn(abn: string): boolean {
  return /^\d{11}$/.test(abn);
}

/**
 * Parse a JSONP response of the form `callback({...})` into an object.
 * Returns null if the wrapper is missing or the inner JSON is invalid.
 */
function parseJsonp(raw: string): Record<string, any> | null {
  const match = raw.match(/^callback\(([\s\S]+)\)\s*$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Derive a human-readable business / entity name from the ABR payload.
 *
 * Non-individual entities  → EntityName (company name).
 * Sole traders (IND)       → first registered BusinessName, or the
 *                             re-ordered EntityName ("Surname, First" → "First Surname").
 */
function extractBusinessName(data: Record<string, any>): string {
  const businessNames: string[] = Array.isArray(data.BusinessName)
    ? data.BusinessName
    : [];

  if (data.EntityTypeCode !== 'IND') {
    // Company / partnership / trust — use entity name
    return data.EntityName || businessNames[0] || 'Unknown';
  }

  // Sole trader — prefer registered business name
  if (businessNames.length > 0 && businessNames[0]) {
    return businessNames[0];
  }

  // Fall back to re-ordered individual name
  const parts = (data.EntityName || '').split(',').map((s: string) => s.trim());
  if (parts.length === 2 && parts[0] && parts[1]) {
    return `${parts[1]} ${parts[0]}`;
  }
  return data.EntityName || 'Unknown';
}

/* ── ABR Lookup ───────────────────────────────────────────────────── */

interface AbrResult {
  found: boolean;
  active: boolean;
  businessName: string;
  entityType: string;
  abnStatus: string;
}

/**
 * Call the ABN Lookup JSON service (server-side only).
 * Throws on network / config errors so the caller can return 502.
 */
async function lookupAbn(abn: string): Promise<AbrResult> {
  const guid = process.env.ABR_GUID;
  if (!guid) {
    throw new Error('ABR_GUID environment variable is not configured');
  }

  const url =
    `https://abr.business.gov.au/json/AbnDetails.aspx` +
    `?abn=${encodeURIComponent(abn)}` +
    `&guid=${encodeURIComponent(guid)}` +
    `&callback=callback`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000), // 10 s hard timeout
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`ABR returned HTTP ${res.status}`);
  }

  const text = await res.text();
  const data = parseJsonp(text);

  if (!data) {
    throw new Error('Could not parse ABR JSONP response');
  }

  // ABR populates the Message field when the ABN is not found.
  if (data.Message && !data.Abn) {
    return {
      found: false,
      active: false,
      businessName: '',
      entityType: '',
      abnStatus: '',
    };
  }

  const abnStatus = (data.AbnStatus || '').trim();
  const active = abnStatus.toLowerCase() === 'active';

  return {
    found: true,
    active,
    businessName: extractBusinessName(data),
    entityType: data.EntityTypeName || data.EntityTypeCode || '',
    abnStatus,
  };
}

/* ── Route handler ────────────────────────────────────────────────── */

export async function POST(req: Request) {
  /* ── Auth ── */
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Not authenticated' },
      { status: 401 },
    );
  }

  /* ── Parse & validate ── */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 },
    );
  }

  const abn = sanitizeAbn(String(body?.abn ?? ''));

  if (abn.length !== 11) {
    return NextResponse.json(
      { ok: false, error: 'Invalid ABN' },
      { status: 400 },
    );
  }

  /* ── Call ABR ── */
  let result: AbrResult;
  try {
    result = await lookupAbn(abn);
  } catch (err) {
    // Do not expose internal details to the client.
    console.error('[abn/verify] ABR lookup error:', (err as Error).message);
    return NextResponse.json(
      { ok: false, error: 'ABN service unavailable' },
      { status: 502 },
    );
  }

  if (!result.found) {
    return NextResponse.json(
      { ok: false, status: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  if (!result.active) {
    return NextResponse.json({
      ok: false,
      status: 'INACTIVE',
      displayStatus: 'ABN not active',
    });
  }

  /* ── Persist (service-role client) ── */
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const now = new Date().toISOString();

  // Audit trail — abn_verifications table (requires migration, see notes).
  // We use .insert() and silently ignore errors if the table doesn't exist yet.
  await admin
    .from('abn_verifications')
    .insert({
      user_id: user.id,
      business_name: result.businessName,
      entity_type: result.entityType,
      status: 'verified',
      provider: 'abr',
      checked_at: now,
    })
    .then(({ error }) => {
      if (error) {
        console.warn('[abn/verify] audit insert skipped:', error.message);
      }
    });

  // Update user profile.
  // ABN is stored in the existing private `abn` column for future re-verification.
  // It is NEVER returned to the client or rendered in public UI.
  const { error: updateError } = await admin
    .from('users')
    .update({
      abn,
      business_name: result.businessName,
      abn_status: 'VERIFIED',
      abn_verified_at: now,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('[abn/verify] profile update failed:', updateError.message);
    return NextResponse.json(
      { ok: false, error: 'Failed to update profile' },
      { status: 500 },
    );
  }

  // Best-effort: update new columns (entity_type, abn_last_checked_at).
  // These columns require a migration — see supabase/migrations notes.
  // If the columns don't exist yet this update silently fails and doesn't
  // block the verification flow.
  await admin
    .from('users')
    .update({
      entity_type: result.entityType,
      abn_last_checked_at: now,
    })
    .eq('id', user.id)
    .then(({ error }) => {
      if (error) {
        console.warn('[abn/verify] extended columns not yet migrated:', error.message);
      }
    });

  /* ── Safe response — ABN value is NEVER included ── */
  return NextResponse.json({
    ok: true,
    status: 'ACTIVE',
    displayStatus: 'ABN verified',
    businessName: result.businessName,
  });
}
