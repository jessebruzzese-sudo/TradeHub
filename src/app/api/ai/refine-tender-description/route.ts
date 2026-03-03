import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';

export const dynamic = 'force-dynamic';

type Body = {
  text?: string;
  trade?: string;
  location?: string;
};

function stripMarkdownHeadings(input: string) {
  return String(input || '')
    .split('\n')
    .map((line) => {
      // Remove markdown heading markers (#, ##, ### etc)
      const stripped = line.replace(/^#{1,6}\s*/, '').trim();

      // Remove empty heading lines
      if (!stripped) return '';

      // Remove redundant top title
      if (/^tender description$/i.test(stripped)) return '';

      return stripped;
    })
    // Remove consecutive blank lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const raw = String(body?.text ?? '').trim();
    const trade = String(body?.trade ?? '').trim();
    const location = String(body?.location ?? '').trim();

    if (!raw) {
      return NextResponse.json(
        { success: false, error: 'Missing text' },
        { status: 400 }
      );
    }

    const system = `
You are TradeHub's tender-writing assistant for Australian construction trades.

Task:
Rewrite the user's rough notes into a clear, professional tender description suitable for a marketplace listing.

Rules:
- Keep meaning the same. Do NOT invent facts.
- Australian spelling (e.g., organise, metre).
- Keep it concise and practical (mobile-friendly).
- Use light Markdown only where helpful (short headings or bullet points).
- Avoid over-structuring or corporate language.
- Do NOT turn it into a formal contract document.
- Do NOT add unnecessary sections.
- Only add a short "Questions / to confirm" section if something critical is missing.
- Tone should feel like an experienced builder posting a job, not a consultant writing a report.

Formatting guidance:
- Start with a short overview paragraph.
- Use bullet points for required trades or key scope.
- Avoid large multi-section templates unless clearly justified.
`;

    const user = `
Trade: ${trade || 'Unknown'}
Location: ${location || 'Unknown'}

User notes:
${raw}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: system.trim() },
        { role: 'user', content: user.trim() },
      ],
    });

    let refined = completion.choices[0]?.message?.content?.trim() ?? '';
    refined = stripMarkdownHeadings(refined);

    return NextResponse.json({
      success: true,
      refined,
    });
  } catch (error: any) {
    console.error('REFINE TENDER ERROR:', error);
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
