import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';

export const dynamic = 'force-dynamic';

type Body = {
  projectName?: string;
  projectDescription?: string;
  trades?: string[];
  location?: string; // "Suburb, VIC 3083" etc
  startDate?: string | null;
  endDate?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const projectName = String(body.projectName ?? '').trim();
    const projectDescription = String(body.projectDescription ?? '').trim();
    const trades = Array.isArray(body.trades) ? body.trades.filter(Boolean).map(String) : [];
    const location = String(body.location ?? '').trim();
    const startDate = body.startDate ?? null;
    const endDate = body.endDate ?? null;

    const sys =
      "You are TradeHub's tender drafting assistant. Write in clear Australian trade language. " +
      "Be professional, direct, and scannable. Do NOT invent details. If info is missing, leave it out.";

    const user = [
      `Project name: ${projectName || '—'}`,
      `Location: ${location || '—'}`,
      `Required trades: ${trades.length ? trades.join(', ') : '—'}`,
      `Desired dates: ${startDate || '—'} → ${endDate || '—'}`,
      '',
      'User notes / rough description:',
      projectDescription || '—',
      '',
      'Task: Produce a ready-to-post tender description with:',
      '- A short overview paragraph',
      '- Bullet list: Scope / tasks',
      '- Bullet list: Inclusions',
      '- Bullet list: Exclusions / assumptions (only if implied)',
      '- Bullet list: Site access / constraints (only if mentioned)',
      '- Timing / start window',
      '- What to include in quote (labour, materials, compliance/testing, etc.)',
      '',
      'Return only the drafted description text (no JSON).',
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    });

    const drafted = completion.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({
      success: true,
      drafted,
    });
  } catch (error: any) {
    console.error('AI DRAFT ERROR:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
