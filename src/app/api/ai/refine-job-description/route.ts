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
    const trade = body?.trade ? String(body.trade).trim() : '';
    const location = body?.location ? String(body.location).trim() : '';

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const userContent = [
      trade && `Trade: ${trade}`,
      location && `Location: ${location}`,
      '',
      'Rewrite and improve this job description:',
      text,
    ]
      .filter((x) => x !== '')
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You write clear job descriptions for Australian construction and trade work. Keep facts from the user; improve structure and tone. No invented pricing or legal claims.',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.55,
      max_tokens: 900,
    });

    const refined = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ refined });
  } catch (e) {
    console.error('[refine-job-description]', e);
    return NextResponse.json({ error: 'Refinement failed' }, { status: 500 });
  }
}
