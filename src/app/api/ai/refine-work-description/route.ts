import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { createServerSupabase } from '@/lib/supabase-server';
import { PREVIOUS_WORK_CAPTION_MAX } from '@/lib/previous-work';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'You need to be signed in.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? '').trim();
    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    const trade = body?.trade != null ? String(body.trade).trim() : '';

    const userContent = [
      trade ? `Primary trade (context only — use for tone, not new facts): ${trade}` : null,
      '',
      'Rewrite the user’s text below as a clear, professional summary of completed trade work. Improve wording and flow; where the text allows, lightly organise ideas (e.g. scope, type of work, outcome) without adding bullets or multiple paragraphs. Keep it to one or two sentences. Do not add details, locations, materials, or outcomes that are not present or clearly implied in the original. Do not exaggerate or use marketing fluff. Output only the rewritten text, no quotes or preamble.',
      '',
      text,
    ]
      .filter((line) => line !== null)
      .join('\n');

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You rewrite portfolio descriptions for Australian tradespeople. Your output must read like a confident, professional project summary: clear, structured prose in one or two sentences—never a bare sentence fix. Use slightly elevated but natural wording (assured, precise). Stay factual: only reflect what the user wrote; never invent scope, brands, compliance claims, or results. Avoid hype, slogans, and stiff corporate tone. No bullet points. No preamble—return only the finished description.',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.42,
      max_tokens: 400,
    });

    let refined = completion.choices[0]?.message?.content?.trim() ?? '';
    if (refined.length > PREVIOUS_WORK_CAPTION_MAX) {
      refined = refined.slice(0, PREVIOUS_WORK_CAPTION_MAX).trim();
    }

    return NextResponse.json({ refined });
  } catch (e) {
    console.error('[refine-work-description]', e);
    return NextResponse.json({ error: 'Refinement failed' }, { status: 500 });
  }
}
