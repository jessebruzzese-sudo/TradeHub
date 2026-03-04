import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFParse } from 'pdf-parse';

import { createServerSupabase } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/is-admin';
import { openai } from '@/lib/ai/openai';
import { TenderAIDraftSchema } from '@/lib/ai/tender-draft-schema';

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

    // ---- Extract PDF text ----
    const pdfTexts: { name: string; text: string }[] = [];

    for (const att of pdfAttachments.slice(0, 5)) {
      const bucket = att.bucket || 'tender-attachments';

      const { data, error } = await adminStorage.storage.from(bucket).download(att.path);
      if (error || !data) continue;

      const buf = new Uint8Array(await data.arrayBuffer());

      const parser = new PDFParse({ data: buf });
      try {
        const result = await parser.getText();
        const text = result?.text ?? '';
        if (text.trim()) {
          pdfTexts.push({ name: att.name, text: text.trim() });
        }
      } finally {
        await parser.destroy();
      }
    }

    if (pdfTexts.length === 0) {
      return NextResponse.json(
        { error: 'No PDF text could be extracted. If these are scanned drawings, OCR is needed (phase 2).' },
        { status: 422 }
      );
    }

    const combinedText = pdfTexts.map((p) => `--- ${p.name} ---\n${p.text}`).join('\n\n');

    // ---- Prompt ----
    const sys = `
You are TradeHub's "Generate tender from plans" assistant.

Return ONLY valid JSON matching exactly this schema:
{
  "project_name": "string",
  "summary": "string",
  "suggested_trades": ["string"],
  "confirmed_from_plans": ["string"],
  "questions_to_confirm": ["string"],
  "assumptions": ["string"],
  "inclusions": ["string"],
  "exclusions": ["string"],
  "timing_notes": ["string"],
  "site_access_notes": ["string"],
  "trade_scopes": { "TradeName": ["string"] },
  "quantities_and_schedules": ["string"],
  "quote_checklist": { "TradeName": ["string"] }
}

Rules:
- Be conservative: ONLY put facts clearly stated into confirmed_from_plans.
- Anything uncertain goes into questions_to_confirm or assumptions.
- suggested_trades: Australian trade names (e.g. Electrician, Plumber, Carpenter).
- trade_scopes: concise bullet-like strings per trade. If unknown, omit that trade.
- quantities_and_schedules: only list quantities/schedules if clearly present in the plan text. Otherwise leave empty.
- quote_checklist: per trade, list 3–7 short items that a subcontractor should confirm before pricing (materials, fixtures, access, staging, exclusions).
- Use Australian English and construction terminology.
`.trim();

    const user = `Extract a tender draft from these plan documents:\n\n${combinedText.slice(0, 120000)}`;

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

    // ✅ Zod validation + defaults
    const draft = TenderAIDraftSchema.parse({
      project_name: String(parsed?.project_name ?? ''),
      summary: String(parsed?.summary ?? ''),
      suggested_trades: Array.isArray(parsed?.suggested_trades) ? parsed.suggested_trades : [],
      confirmed_from_plans: Array.isArray(parsed?.confirmed_from_plans) ? parsed.confirmed_from_plans : [],
      questions_to_confirm: Array.isArray(parsed?.questions_to_confirm) ? parsed.questions_to_confirm : [],
      assumptions: Array.isArray(parsed?.assumptions) ? parsed.assumptions : [],
      inclusions: Array.isArray(parsed?.inclusions) ? parsed.inclusions : [],
      exclusions: Array.isArray(parsed?.exclusions) ? parsed.exclusions : [],
      timing_notes: Array.isArray(parsed?.timing_notes) ? parsed.timing_notes : [],
      site_access_notes: Array.isArray(parsed?.site_access_notes) ? parsed.site_access_notes : [],
      trade_scopes: typeof parsed?.trade_scopes === 'object' && parsed?.trade_scopes ? parsed.trade_scopes : {},
      quantities_and_schedules: Array.isArray(parsed?.quantities_and_schedules) ? parsed.quantities_and_schedules : [],
      quote_checklist: typeof parsed?.quote_checklist === 'object' && parsed?.quote_checklist ? parsed.quote_checklist : {},
    });

    // ✅ Save to tenders.ai_draft
    const { error: saveErr } = await supabase
      .from('tenders')
      .update({ ai_draft: draft } as Record<string, unknown>)
      .eq('id', tenderId);

    if (saveErr) {
      console.error('[plan-draft] save ai_draft failed', saveErr);
      // Still return the draft even if saving fails
    }

    return NextResponse.json({ draft });
  } catch (error: any) {
    console.error('[plan-draft]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to generate draft' },
      { status: 500 }
    );
  }
}
