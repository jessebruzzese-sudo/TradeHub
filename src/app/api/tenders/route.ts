// @ts-nocheck - Supabase client type inference
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getTier, getLimits } from '@/lib/plan-limits';
import { checkTenderCreationLimit } from '@/lib/tender-limit-utils';
import { isAdmin } from '@/lib/is-admin';
import { validateTradeName } from '@/lib/trade-validation';
import { hasValidCoordinates } from '@/lib/coordinates';

export const dynamic = 'force-dynamic';

async function geocodeFromPlaceId(placeId: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'geometry');
    url.searchParams.set('key', key);
    const res = await fetch(url.toString());
    const data = await res.json().catch(() => ({}));
    const loc = data?.result?.geometry?.location;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch {
    // ignore
  }
  return null;
}

async function geocodeFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', `${address}, Australia`);
    url.searchParams.set('key', key);
    const res = await fetch(url.toString());
    const data = await res.json().catch(() => ({}));
    const result = data?.results?.[0];
    const loc = result?.geometry?.location;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectName,
      projectDescription,
      suburb,
      postcode,
      place_id: placeId,
      lat: bodyLat,
      lng: bodyLng,
      isNameHidden = false,
      isAnonymous = false,
      status = 'PUBLISHED',
      tier = 'FREE_TRIAL',
      tradeRequirements = [],
    } = body;

    const isDraft = String(status || '').toUpperCase() === 'DRAFT';

    if (!isDraft) {
      if (!projectName?.trim() || !suburb?.trim() || !postcode?.trim()) {
        return NextResponse.json(
          { error: 'projectName, suburb, and postcode are required' },
          { status: 400 }
        );
      }
    }

    const { data: dbUser, error: userErr } = await supabase
      .from('users')
      .select('id, plan, role, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    // ✅ Draft scaffolds should NOT count toward monthly tender limits
    if (!isDraft && !isAdmin(dbUser)) {
      const limitResult = await checkTenderCreationLimit(supabase, authUser.id, dbUser);
      if (!limitResult.allowed) {
        console.warn(
          `[plan-limits] user_id=${dbUser.id} tier=${getTier(dbUser)} reason=tender_per_month_limit count=${limitResult.count}`
        );
        return NextResponse.json(
          { error: limitResult.message || 'Free plan includes 1 active tender per month.' },
          { status: 403 }
        );
      }
    }

    // Resolve lat/lng: prefer body, else place_id geocode, else address geocode, else null
    let lat: number | null = null;
    let lng: number | null = null;
    if (hasValidCoordinates(bodyLat, bodyLng)) {
      lat = Number(bodyLat);
      lng = Number(bodyLng);
    } else if (typeof placeId === 'string' && placeId.trim()) {
      const coords = await geocodeFromPlaceId(placeId.trim());
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }
    if (lat == null && suburb?.trim() && postcode?.trim()) {
      const coords = await geocodeFromAddress(`${suburb.trim()} ${postcode.trim()} Australia`);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    const tenderInsert = {
      builder_id: authUser.id,
      status: isDraft ? 'DRAFT' : status,
      tier,
      is_name_hidden: !!isNameHidden,
      is_anonymous: !!isAnonymous,

      // ✅ Draft placeholders (so we can create a tenderId before user fills fields)
      project_name: isDraft
        ? String(projectName || 'Draft tender').trim()
        : String(projectName).trim(),

      project_description: String(projectDescription || '').trim(),

      suburb: isDraft ? String(suburb || '').trim() : String(suburb).trim(),
      postcode: isDraft ? String(postcode || '').trim() : String(postcode).trim(),

      // Use real coordinates when available; null when not (no 0/0 fallback)
      lat,
      lng,
    };

    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .insert(tenderInsert)
      .select()
      .single();

    if (tenderError) {
      console.error('Tender insert error:', tenderError);
      return NextResponse.json({ error: tenderError.message }, { status: 500 });
    }

    if (Array.isArray(tradeRequirements) && tradeRequirements.length > 0) {
      const tradeReqs = tradeRequirements
        .map((req: any) => {
          const canonical = validateTradeName(req.trade);
          return canonical
            ? {
                tender_id: tender.id,
                trade: canonical,
                sub_description: req.subDescription || '',
                min_budget_cents: req.budgetMin ? Math.round(Number(req.budgetMin) * 100) : null,
                max_budget_cents: req.budgetMax ? Math.round(Number(req.budgetMax) * 100) : null,
              }
            : null;
        })
        .filter(Boolean);

      const { error: tradeError } = await supabase.from('tender_trade_requirements').insert(tradeReqs);
      if (tradeError) {
        console.error('Trade requirements insert error:', tradeError);
      } else if (process.env.NODE_ENV === 'development' && tradeReqs.length > 0) {
        console.log('[tenders] trade rows persisted:', tradeReqs.map((r: any) => r.trade));
      }
    }

    return NextResponse.json({ tender });
  } catch (err) {
    console.error('Tenders API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
