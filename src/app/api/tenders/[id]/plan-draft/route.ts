// @ts-nocheck - Supabase client type inference
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';

import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/is-admin';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { openai } from '@/lib/ai/openai';
import { inferTradesFromPlanText } from '@/lib/ai/plan-trade-inference';
import { cleanTenderDraft } from '@/lib/ai/clean-tender-draft';
import { TenderAIDraftSchema } from '@/lib/ai/tender-draft-schema';
import type { TenderAIDraft } from '@/lib/ai/tender-draft-schema';
import { preprocessPdfPlan } from '@/lib/ai/pdf-plan-preprocess';
import { groupPagesByDwelling } from '@/lib/ai/plan-dwelling-grouping';
import { buildPlanAIContext } from '@/lib/ai/build-plan-ai-context';

export const dynamic = 'force-dynamic';

type StoredAttachment = {
  name: string;
  path: string;
  size: number;
  type: string;
  bucket: string;
};

function isPremiumUser(u: any) {
  return (
    u?.isPremium === true ||
    u?.is_premium === true ||
    u?.subscription_status === 'active' ||
    u?.subcontractor_sub_status === 'active' ||
    u?.active_plan === 'premium' ||
    u?.subcontractor_plan === 'premium'
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: tenderId } = await ctx.params;

  try {
    const supabase = createServerSupabase();

    // ---- Auth ----
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // ---- Load current user (for premium + admin) ----
    const { data: dbUser, error: userErr } = await supabase
      .from('users')
      .select('id, role, is_premium, subscription_status, active_plan, subcontractor_plan, subcontractor_sub_status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    const admin = isAdmin(dbUser);

    // ✅ Premium gate (admins bypass)
    if (!admin && !isPremiumUser(dbUser)) {
      return NextResponse.json({ error: 'Premium required' }, { status: 402 });
    }

    // ---- Tender ownership/admin check ----
    const { data: tenderRow, error: tenderErr } = await supabase
      .from('tenders')
      .select('id, builder_id')
      .eq('id', tenderId)
      .single();

    if (tenderErr || !tenderRow) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    if (!admin && tenderRow.builder_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ---- Fetch shared_attachments JSONB (may not be in generated types) ----
    const { data: fullRow, error: fullErr } = await supabase
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .single();

    if (fullErr || !fullRow) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    const attachments = ((fullRow as Record<string, unknown>)?.shared_attachments ?? []) as StoredAttachment[];

    const pdfAttachments = attachments.filter(
      (a) => a?.type?.toLowerCase().includes('pdf') || a?.name?.toLowerCase().endsWith('.pdf')
    );

    if (pdfAttachments.length === 0) {
      return NextResponse.json(
        { error: 'No PDF files attached to this tender. Upload plans first.' },
        { status: 400 }
      );
    }

    // Use service role for storage download
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const adminStorage = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // ---- Extract PDF text; when limited, run full preprocessing (OCR, classify, rotate) ----
    let extractedText = '';
    let preprocessedPages: Awaited<ReturnType<typeof preprocessPdfPlan>>['pages'] = [];

    for (const att of pdfAttachments.slice(0, 5)) {
      try {
        const bucket = att.bucket || 'tender-attachments';

        const { data, error } = await adminStorage.storage.from(bucket).download(att.path);
        if (error || !data) continue;

        const buf = Buffer.from(await data.arrayBuffer());
        let text = '';
        try {
          const pdfDoc = await getDocumentProxy(new Uint8Array(buf));
          const out = await extractText(pdfDoc, { mergePages: true });
          text = out.text ?? '';
        } catch (extractErr) {
          console.warn('[plan-draft] PDF embedded text extraction failed, will try OCR', att.name, extractErr);
        }
        if (text?.trim()) {
          extractedText += (extractedText ? '\n\n' : '') + `--- ${att.name} ---\n${text.trim()}`;
        }
        const limited = !text || text.length < 200;
        if (limited && preprocessedPages.length === 0) {
          try {
            const result = await preprocessPdfPlan(buf, att.name);
            preprocessedPages = result.pages;
            console.log('[plan-draft] preprocessed PDF pages', result.pages.length, 'of', result.totalPages);
          } catch (preErr) {
            console.warn('[plan-draft] PDF preprocess failed', preErr);
          }
        }
      } catch (extractErr) {
        console.warn('[plan-draft] extraction failed for', att.name, extractErr);
      }
    }

    const dwellingGroups = preprocessedPages.length > 0 ? groupPagesByDwelling(preprocessedPages) : [];
    const pdfOcrText = preprocessedPages
      .map((p) => p.ocrText)
      .filter(Boolean)
      .join('\n\n');
    let combinedText =
      preprocessedPages.length > 0
        ? [extractedText, pdfOcrText].filter(Boolean).join('\n\n')
        : extractedText.trim();

    console.log('[plan-draft] embedded text length', extractedText.length);
    console.log('[plan-draft] PDF OCR text length', pdfOcrText.length);
    console.log('[plan-draft] combined text length', combinedText.length);

    if (!combinedText.trim()) {
      const fallbackParts: string[] = [];
      if (preprocessedPages.length > 0) {
        const pageTypes = [...new Set(preprocessedPages.map((p) => p.pageType))].filter((t) => t !== 'unknown');
        const headings = preprocessedPages.flatMap((p) => p.headingHints).filter(Boolean).slice(0, 10);
        if (pageTypes.length > 0 || headings.length > 0) {
          fallbackParts.push(
            `Architectural plan set detected. Page types: ${pageTypes.join(', ') || 'mixed'}.`,
            headings.length > 0 ? `Headings: ${headings.join('; ')}` : ''
          );
        }
      }
      if (fallbackParts.length > 0) {
        combinedText = fallbackParts.filter(Boolean).join(' ');
        console.log('[plan-draft] using fallback context', combinedText.slice(0, 200));
      }
    }

    if (!combinedText.trim()) {
      return NextResponse.json(
        { error: 'No text could be extracted from the plans. If these are scanned drawings, try re-uploading.' },
        { status: 422 }
      );
    }

    const inferredTrades = inferTradesFromPlanText(combinedText);
    const pdfTextLimited = extractedText.length < 200;
    const limitedHint = pdfTextLimited
      ? '\n\nNote: PDF embedded text was limited. Use the inferred trade hints and any extracted text to produce a best-effort draft. Include a note in the response.'
      : '';

    const { inferLocationFromPlanText } = await import('@/lib/ai/plan-location-inference');
    const { detectRoomsFromPlanText, detectBuildingElements } = await import('@/lib/ai/plan-room-detection');
    const { detectDrainageFromPlanText } = await import('@/lib/ai/plan-drainage-detection');
    const inferredLocation = inferLocationFromPlanText(combinedText);
    const roomCounts = detectRoomsFromPlanText(combinedText);
    const building = detectBuildingElements(combinedText);
    const drainage = detectDrainageFromPlanText(combinedText);

    const planContext =
      preprocessedPages.length > 0
        ? buildPlanAIContext(
            preprocessedPages,
            dwellingGroups,
            roomCounts,
            building,
            drainage,
            inferredTrades,
            extractedText,
            ''
          )
        : null;

    const dwellingCount = planContext?.detectedDwellingCount ?? 1;
    const projectStructure = planContext?.projectStructure;
    const storeyLabelForHint = projectStructure?.likelyStoreyLabel ?? projectStructure?.storeyLabel ?? (building.floors >= 2 ? 'double storey' : 'single storey');
    const dwellingStoreyHint =
      dwellingCount >= 2 && projectStructure?.dwellingStoreys?.length
        ? `\n\nDwelling groups detected:\n${projectStructure.dwellingStoreys
            .filter((s: { dwellingLabel: string }) => !['Unassigned', 'Main'].includes(s.dwellingLabel))
            .map((s: { dwellingLabel: string; hasGroundFloorPlan: boolean; hasFirstFloorPlan: boolean; floors: number }) => `- ${s.dwellingLabel}: ${s.hasGroundFloorPlan && s.hasFirstFloorPlan ? 'ground floor + first floor plans' : s.floors === 1 ? 'single storey' : `${s.floors} storeys`}`)
            .join('\n')}\n\n${projectStructure.likelyStoreyLabel === 'mixed/uncertain' ? 'Storey evidence is partially incomplete; do NOT assume single-storey unless clearly supported. Use neutral wording: "residential works across 2 dwellings".' : `This indicates ${dwellingCount} ${projectStructure.likelyStoreyLabel} dwellings.`}`
        : '';
    const multiDwellingHint =
      dwellingCount >= 2
        ? `\n\nMULTI-DWELLING: This plan set appears to contain ${dwellingCount} dwellings (${planContext?.detectedDwellingLabels?.join(', ') ?? 'grouped'}). Grouped page analysis indicates these dwellings are likely ${storeyLabelForHint}. When supported, project description MUST mention dwelling count and storey count. Do NOT describe as a single dwelling. Write scopes to reflect works across multiple dwellings where appropriate.`
        : '';

    const inferredContext =
      inferredTrades.length > 0
        ? `\n\nInferred trade hints from plan keywords:\n${JSON.stringify(
            inferredTrades.map((t) => ({ trade: t.trade, confidence: t.confidence, evidence: t.evidence }))
          )}`
        : '';
    const locationHint = inferredLocation
      ? `\n\nInferred location from plan text (use to populate detected_location if consistent): ${JSON.stringify(inferredLocation)}`
      : '';
    const roomHint =
      roomCounts.bathrooms > 0 || roomCounts.ensuites > 0 || roomCounts.kitchens > 0 || roomCounts.laundries > 0
        ? `\n\nDetected wet areas: ${JSON.stringify(roomCounts)}. Use these counts in Plumbing scope.`
        : '';
    const storeyLabelForBuilding =
      dwellingCount >= 2 && projectStructure?.likelyStoreyLabel === 'mixed/uncertain'
        ? `${dwellingCount} residential dwellings (storey evidence incomplete)`
        : dwellingCount >= 2 && !projectStructure?.likelyStoreyLabel
          ? `${dwellingCount} residential dwellings (storey evidence incomplete)`
          : dwellingCount >= 2 && projectStructure?.likelyStoreyLabel
            ? projectStructure.likelyStoreyLabel === 'triple storey'
              ? 'triple storey dwellings'
              : projectStructure.likelyStoreyLabel === 'double storey'
                ? 'double storey dwellings'
                : projectStructure.likelyStoreyLabel === 'single storey' && projectStructure?.hasStrongSingleStoreyEvidence
                  ? 'single storey dwellings'
                  : `${dwellingCount} residential dwellings`
            : building.floors >= 3 ? 'triple storey dwelling' : building.floors === 2 ? 'double storey dwelling' : 'single storey dwelling';
    const storeyHintForMulti =
      dwellingCount >= 2 && (projectStructure?.likelyStoreyLabel === 'mixed/uncertain' || !projectStructure?.likelyStoreyLabel)
        ? ' Storey evidence is incomplete; use neutral wording: "residential dwellings" or "2 dwellings". Do NOT assume single storey.'
        : dwellingCount >= 2 && projectStructure?.likelyStoreyLabel
          ? ` Use ${storeyLabelForBuilding} in the description.`
          : building.floors >= 2 ? ' Use for Electrical/Carpentry scope when double storey.' : ' This is a single storey dwelling – do not describe as two-storey or double storey.';
    const buildingHint =
      building.floors >= 2 || building.hasGarage || building.hasAlfresco || dwellingCount >= 2
        ? `\n\nDetected building: ${storeyLabelForBuilding}, garage: ${building.hasGarage}, alfresco: ${building.hasAlfresco}.${storeyHintForMulti}`
        : '';
    console.log('[plan-draft] building detection', { floors: building.floors, hasGroundFloor: building.hasGroundFloor, hasFirstFloor: building.hasFirstFloor, hasSecondFloor: building.hasSecondFloor });
    console.log('[plan-draft] building hint', buildingHint.trim() || '(none)');
    const drainageHint =
      drainage.hasStormwater || drainage.hasDownpipes || drainage.hasGutters
        ? `\n\nDetected drainage signals. Consider "Roof plumbing / stormwater" trade.`
        : '';

    // ---- Prompt ----
    const sys = `You are assisting a builder preparing a subcontractor tender from residential building plans. Think like an estimator or builder reviewing a set of plans before sending packages to subcontractors.

Important rules:
1. Identify ALL relevant trade packages reasonably supported by the plans, not just the most obvious 3–5 trades.
2. Prefer a full residential trade breakdown where evidence supports it.
3. Include trades even if their scope is secondary, as long as they are plausibly required for this build.
4. Do not invent highly specific scope that is not supported by the plans.
5. Write trade scopes like a builder requesting quotes from subcontractors.
6. Keep each scope concise, practical, and subcontractor-ready.
7. AVOID vague phrases: "general works", "as required", "etc", "scope to be confirmed".
8. If evidence is weak, still provide the most likely practical scope, but reduce confidence.
9. Return between 6 and 15 trade packages when supported by the plans.
10. Prefer standard Australian residential construction trade categories.

ALLOWED TRADES (you MUST use ONLY these exact names – no variations, no new categories):
${TRADE_CATEGORIES.map((t) => `- ${t}`).join('\n')}

CRITICAL trade rules:
- Only use trade names from the allowed list above. Copy them exactly.
- Do NOT invent, rename, merge, split, or approximate trade categories.
- If no suitable trade exists in the list, omit it rather than creating a new one.
- Do NOT use "Wall Linings", "Interior Finishes", "Bathroom Finishes", "Masonry", "Roof plumbing" (use "Roof plumbing / stormwater"), or similar variants.

Output ONLY valid JSON:
{
  "project_name": "string",
  "project_description": "string",
  "suggested_trades_with_scope": [
    {
      "trade": "Plumbing",
      "scope": "string",
      "confidence": 0.9,
      "evidence": ["string"]
    }
  ],
  "estimated_duration_days": 0,
  "notes": "string",
  "detected_location": {
    "address_text": "string or null",
    "suburb": "string or null",
    "postcode": "string or null",
    "state": "string or null",
    "confidence": 0.0 to 1.0
  }
}

suggested_trades_with_scope rules:
- Include only distinct trade packages. No duplicate trades.
- Sort from highest confidence to lowest confidence.
- Use realistic trade names. Each scope: 1–3 sentences max.
- Reference rooms, floors, wet areas, roof drainage, framing, garage, alfresco, or other building elements when known.

Examples of good scopes:
Plumbing: "Supply and install sanitary plumbing, drainage, floor wastes and hot water service to bathrooms, ensuite, kitchen and laundry as per plans."
Electrical: "Electrical rough-in and fit-off including lighting, power, smoke alarms and data points throughout the dwelling as per electrical layout."
Carpentry: "Timber wall and roof framing including internal structural framing, roof framing and general carpentry associated with the dwelling."
Roof plumbing / stormwater: "Install gutters, downpipes and stormwater drainage connected to the legal point of discharge as shown on plans."
Waterproofing: "Waterproof membrane installation to bathrooms, ensuite and other wet areas prior to tiling."
Tiling: "Wall and floor tiling to bathrooms, ensuite and other nominated wet areas, including shower areas and splashbacks where applicable."
Cabinet making / joinery: "Supply and install kitchen, vanity and other built-in joinery items shown on plans."
Painting: "Prepare and paint internal and external building surfaces following completion of plastering, cladding and trim works."

Location: Extract from titles, site details, permit notes, drawing title blocks. Prefer suburb + postcode + state. Do NOT stuff full address into project_name.
Project name: Short (max ~80 chars). Prefer "New dwelling – Aloe Court" or "New dwelling – South Morang". Avoid "Project Works", "Construction project".
Project description: One short professional paragraph. No marketing, no "please quote accordingly". CRITICAL: Use the Detected building storey label exactly. If it says "single storey dwelling", describe as single storey only. Do NOT use "double storey", "two-storey" or "2-storey" unless the building hint says double or triple storey.
Notes: Only when useful (weak extraction, low confidence). Omit if draft is strong.

Trade names: Use ONLY the allowed list above. Copy each name exactly.

Your output should feel like a real tender package list prepared by a builder, not a generic AI summary.`;

    const dwellingSummaryBlock =
      planContext && planContext.dwellingSummaryLines?.length > 0
        ? `\nDwelling summaries: ${planContext.dwellingSummaryLines.map((l) => l).join('; ')}`
        : '';

    const structuredContext = planContext
      ? `\n\nStructured plan context: ${planContext.pageSummary}\nProject hints: ${planContext.projectHints.join('; ')}\nDwelling groups: ${planContext.dwellingGroups.map((g) => `${g.label} (${g.pageTypes.join(', ')})`).join('; ')}${dwellingSummaryBlock}\n\n--- Combined text ---\n${planContext.combinedText.slice(0, 100000)}`
      : combinedText.slice(0, 120000);

    const user = `Extract a tender draft from these plan documents:${limitedHint}${multiDwellingHint}${dwellingStoreyHint}${locationHint}${roomHint}${buildingHint}${drainageHint}\n\n${structuredContext}${inferredContext}`;

    // ---- OpenAI call ----
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      // Helps a lot to avoid markdown/codefence
      response_format: { type: 'json_object' } as any,
    });

    const raw = completion.choices?.[0]?.message?.content ?? '';
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON. Try again.' }, { status: 500 });
    }

    const parsedDraft: TenderAIDraft = {
      project_name: parsed?.project_name ?? null,
      summary: parsed?.project_description ?? parsed?.summary ?? null,
      project_description: parsed?.project_description ?? parsed?.summary ?? null,
      suggested_trades: Array.isArray(parsed?.suggested_trades) ? parsed.suggested_trades : [],
      suggested_trades_with_scope: parsed?.suggested_trades_with_scope ?? [],
      trade_scopes: typeof parsed?.trade_scopes === 'object' && parsed?.trade_scopes ? parsed.trade_scopes : {},
      estimated_duration_days: parsed?.estimated_duration_days ?? null,
      notes: parsed?.notes ?? null,
      confirmed_from_plans: [],
      questions_to_confirm: [],
      assumptions: [],
      inclusions: [],
      exclusions: [],
      timing_notes: [],
      site_access_notes: [],
      quantities_and_schedules: Array.isArray(parsed?.quantities_and_schedules) ? parsed.quantities_and_schedules : [],
      quote_checklist: typeof parsed?.quote_checklist === 'object' && parsed?.quote_checklist ? parsed.quote_checklist : {},
      detected_location: parsed?.detected_location ?? undefined,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('[plan-draft] AI generated trades:', parsedDraft.suggested_trades_with_scope?.map((t) => t.trade) ?? []);
    }
    console.log('[plan-draft] raw draft', { project_name: parsedDraft.project_name, suggested_trades: parsedDraft.suggested_trades_with_scope?.map((t) => t.trade) });

    const { draft: cleanedDraft, fallbackScopesApplied, tradesPruned } = cleanTenderDraft(
      parsedDraft,
      inferredTrades,
      combinedText,
      pdfTextLimited,
      dwellingCount,
      {
        detectedDwellingLabels: planContext?.detectedDwellingLabels,
        storeyEvidenceSupportsDouble: (projectStructure?.likelyStoreysPerDwelling ?? 0) >= 2,
        likelyStoreyLabel: projectStructure?.likelyStoreyLabel,
        hasStrongSingleStoreyEvidence: projectStructure?.hasStrongSingleStoreyEvidence ?? false,
      }
    );

    console.log('[plan-draft] detectedDwellingCount', dwellingCount);
    console.log('[plan-draft] dwellingStoreys', projectStructure?.dwellingStoreys);
    console.log('[plan-draft] likelyStoreyLabel', projectStructure?.likelyStoreyLabel);
    console.log('[plan-draft] final description', cleanedDraft.project_description?.slice(0, 150));
    console.log('[plan-draft] final summary', cleanedDraft.plan_summary?.summaryItems);

    if (fallbackScopesApplied.length > 0) console.log('[plan-draft] fallback scopes applied', fallbackScopesApplied);
    if (tradesPruned.length > 0) console.log('[plan-draft] trades pruned', tradesPruned);
    if (process.env.NODE_ENV === 'development') {
      console.log('[plan-draft] validated trades kept:', cleanedDraft.suggested_trades_with_scope?.map((t) => t.trade) ?? []);
    }

    const draftWithScope = {
      ...TenderAIDraftSchema.parse({
        project_name: cleanedDraft.project_name ?? '',
        summary: cleanedDraft.project_description ?? cleanedDraft.summary ?? '',
        suggested_trades: cleanedDraft.suggested_trades ?? [],
        confirmed_from_plans: [],
        questions_to_confirm: [],
        assumptions: [],
        inclusions: [],
        exclusions: [],
        timing_notes: [],
        site_access_notes: [],
        trade_scopes: cleanedDraft.trade_scopes ?? {},
        quantities_and_schedules: cleanedDraft.quantities_and_schedules ?? [],
        quote_checklist: cleanedDraft.quote_checklist ?? {},
        detected_location: cleanedDraft.detected_location ?? undefined,
      }),
      project_description: cleanedDraft.project_description ?? cleanedDraft.summary,
      suggested_trades_with_scope: cleanedDraft.suggested_trades_with_scope ?? [],
      estimated_duration_days: cleanedDraft.estimated_duration_days ?? null,
      notes: cleanedDraft.notes ?? null,
      detected_location: cleanedDraft.detected_location ?? undefined,
      detected_rooms: cleanedDraft.detected_rooms ?? undefined,
      plan_summary: cleanedDraft.plan_summary ?? undefined,
      plan_confidence: cleanedDraft.plan_confidence ?? undefined,
      detected_signals: cleanedDraft.detected_signals ?? undefined,
      detected_building: cleanedDraft.detected_building ?? undefined,
    };

    // ✅ Save to tenders.ai_draft
    const { error: saveErr } = await supabase
      .from('tenders')
      .update({ ai_draft: draftWithScope } as Record<string, unknown>)
      .eq('id', tenderId);

    if (saveErr) {
      console.error('[plan-draft] save ai_draft failed', saveErr);
    }

    return NextResponse.json({ draft: draftWithScope });
  } catch (error: any) {
    console.error('[plan-draft]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to generate draft' },
      { status: 500 }
    );
  }
}
