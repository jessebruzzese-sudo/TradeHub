import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';

export const dynamic = 'force-dynamic';

type Body = {
  text?: string;
  trade?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const raw = String(body?.text ?? '').trim();
    const trade = String(body?.trade ?? '').trim();

    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'Missing text' },
        { status: 400 }
      );
    }

    const system = `
You are TradeHub's assistant for Australian construction subcontractors.

Task:
Rewrite the user's rough notes into a clear, professional availability description suitable for a subcontracting marketplace.

Rules:
- Keep the same factual meaning. Do NOT invent trades, capacity, or dates the user did not mention.
- Australian spelling (e.g., organise, metre).
- Keep it concise (1–3 sentences, max ~150 words). Mobile-friendly.
- Plain text only. No markdown headings, no bullet lists unless the user had multiple distinct points.
- Tone: professional, direct, like an experienced tradesperson posting availability.
- Do NOT add marketing fluff, exaggerated claims, or long paragraphs.
- Do NOT add trades or crew size the user did not mention.
- Do NOT change dates or timeframes the user specified.

Good output style:
- "Available for plumbing rough-in work next week. Two qualified tradespeople available for 3 days."
- "Available for fit-off, maintenance, and small project support over the next two weeks."
- "Crew available for subcontracting work from Monday to Thursday next week. Experienced in residential framing and fix-outs."

Avoid:
- Marketing language or sales pitch
- Inventing details
- Overly formal or corporate tone
`.trim();

    const user = trade
      ? `Trade: ${trade}\n\nUser notes:\n${raw}`
      : `User notes:\n${raw}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    let refined = completion.choices[0]?.message?.content?.trim() ?? '';

    // Trim to 500 chars (matches textarea maxLength)
    if (refined.length > 500) {
      refined = refined.slice(0, 497).trim() + '…';
    }

    return NextResponse.json({
      success: true,
      refined,
    });
  } catch (error: unknown) {
    console.error('[refine-availability-description]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
