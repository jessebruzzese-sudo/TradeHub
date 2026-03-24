import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? '').trim();
    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You refine profile bios for Australian tradespeople. Keep factual content; improve clarity and tone. Two to four sentences max.',
        },
        { role: 'user', content: text },
      ],
      temperature: 0.6,
      max_tokens: 400,
    });

    const refined = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ refined });
  } catch (e) {
    console.error('[refine-bio]', e);
    return NextResponse.json({ error: 'Refinement failed' }, { status: 500 });
  }
}
