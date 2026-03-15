import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';

export const dynamic = 'force-dynamic';

function hasPlansMention(text: string) {
  const t = String(text || '').toLowerCase();
  return /(plan|plans|drawing|drawings|blueprint|blueprints|pdf|docs|documentation|specs|specifications)/i.test(t);
}

function cleanProjectTitle(input: string) {
  let s = String(input || '').trim();

  // Remove code fences
  s = s.replace(/```[\s\S]*?```/g, '').trim();

  // Remove markdown headings (#, ## etc.)
  s = s.replace(/^#{1,6}\s*/gm, '');

  // Remove bold/italics markers
  s = s.replace(/\*\*(.*?)\*\*/g, '$1');
  s = s.replace(/\*(.*?)\*/g, '$1');

  // Remove common tender labels
  s = s.replace(/^(tender description|project overview)\s*[:\-]?\s*/i, '');

  // Remove bullets
  s = s.replace(/^[-–—•]+\s*/gm, '');

  // Keep only first non-empty line
  const firstLine =
    s.split('\n').map(l => l.trim()).find(l => l.length > 0) || '';

  s = firstLine;

  // Collapse extra spaces
  s = s.replace(/\s+/g, ' ').trim();

  // Hard max length (protect UI layout)
  if (s.length > 90) {
    s = s.slice(0, 90).trim();
  }

  // Remove trailing punctuation clutter
  s = s.replace(/[.:,\-–—]+$/g, '').trim();

  return s;
}

function normStr(v: string) {
  return String(v || '').trim().toLowerCase();
}

function includesLoosely(haystack: string, needle: string) {
  const h = normStr(haystack);
  const n = normStr(needle);
  if (!h || !n) return false;
  return h.includes(n);
}

function splitTrades(tradeRaw: string) {
  // trade comes in as "Plumber, Electrician" etc
  const list = String(tradeRaw || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  // de-dupe (case-insensitive)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of list) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function appendTitleContext(opts: { title: string; location?: string; trades?: string[]; maxLen?: number }) {
  const maxLen = opts.maxLen ?? 90;

  let title = cleanProjectTitle(opts.title);
  if (!title) return '';

  const loc = String(opts.location || '').trim();
  const trades = opts.trades || [];

  // Append location if it's not already in the title (loose check)
  if (loc && !includesLoosely(title, loc)) {
    const candidate = `${title} – ${loc}`;
    title = candidate.length <= maxLen ? candidate : title;
  }

  // Append trades if provided and not already referenced
  if (trades.length > 0) {
    // If title already mentions "trade" or any one trade name, skip
    const alreadyMentionsAnyTrade =
      includesLoosely(title, 'trade') || trades.some((t) => includesLoosely(title, t));

    if (!alreadyMentionsAnyTrade) {
      // keep it short: max 3 trades then "+N"
      const top = trades.slice(0, 3);
      const extra = trades.length - top.length;

      const tradeLabel = extra > 0 ? `${top.join(', ')} +${extra}` : top.join(', ');
      const suffix = ` (Trades: ${tradeLabel})`;

      const candidate = `${title}${suffix}`;
      title = candidate.length <= maxLen ? candidate : title;
    }
  }

  // Final hard-cap
  if (title.length > maxLen) {
    title = title.slice(0, maxLen).trim().replace(/[.:,\-–—]+$/g, '').trim();
  }

  return title;
}

function trimToConfirmSection(text: string) {
  const lines = String(text || '').split('\n');

  const out: string[] = [];
  let inConfirm = false;
  let confirmBullets = 0;

  for (const line of lines) {
    const l = line.trim();

    // detect start of confirm section
    if (/^(to confirm|questions\s*\/\s*to confirm|questions to confirm)\s*:?\s*$/i.test(l)) {
      inConfirm = true;
      out.push('To confirm:');
      continue;
    }

    if (!inConfirm) {
      out.push(line);
      continue;
    }

    // allow only up to 3 bullets
    if (/^[-•]\s+/.test(l)) {
      confirmBullets += 1;
      if (confirmBullets <= 3) out.push(line);
      continue;
    }

    // if we hit a non-bullet line after confirm section started, end confirm mode
    if (confirmBullets > 0 && l.length > 0 && !/^[-•]\s+/.test(l)) {
      inConfirm = false;
      out.push(line);
      continue;
    }
  }

  return out.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const raw = String(body?.text ?? '').trim();
    const allowPlansLine = hasPlansMention(raw);
    const trade = String(body?.trade ?? '').trim();
    const location = String(body?.location ?? '').trim();
    const mode = String(body?.mode ?? 'description').trim(); // 'name' | 'description' | 'bio'

    if (!raw) {
      return NextResponse.json({ success: false, error: 'Missing text' }, { status: 400 });
    }

    const systemBio = `
You are TradeHub's assistant for Australian trade and construction professionals.

Task:
Refine the user's existing business bio. Do NOT generate from scratch — only improve what they wrote.

Rules:
- Keep the same meaning, trade context, and business details. Preserve user intent.
- Improve clarity, grammar, and presentation. Make it sound trustworthy and professional.
- Keep it short to medium length (2–5 sentences typical).
- Avoid hype, exaggerated claims, or marketing fluff.
- Australian spelling.
- Output plain text only — no markdown, no headings, no bullet points, no labels.
`.trim();

    const systemName = `
You are TradeHub's assistant.

Task:
Rewrite the user's input into a SHORT project title (project name) for an Australian construction tender.

Rules:
- Output MUST be a single line only.
- NO markdown, NO headings, NO bullet points, NO labels (e.g. no "Tender Description", no "Project Overview").
- Keep the same meaning. Do NOT invent facts.
- Australian spelling.
- Maximum 90 characters.
- Prefer plain, specific titles like: "Single-storey home build – South Morang (trades required)"
`.trim();

    const systemDescription = `
You are TradeHub's tender-writing assistant for Australian construction trades.

Write like an experienced builder posting a tender (simple, direct, practical).
Rewrite the user's notes into a clearer listing. Keep meaning the same.

Hard rules:
- Do NOT invent details (materials, brands, compliance items, permits, timelines, budgets, meetings, etc).
- Do NOT add filler "requirements" sections unless the user explicitly mentioned them.
- Do NOT say "all trades required" unless the user explicitly said all trades.
- ${allowPlansLine ? "You MAY mention plans/drawings because the user mentioned them." : "Do NOT mention plans/drawings/specs because the user did NOT mention them."}

Structure:
- Start with 1–2 sentence overview.
- Then short bullet points using only info from the user.
- Only add "To confirm" if critical blockers exist (MAX 3 bullets).

Formatting:
- No Markdown headings (#, ##). Plain text + bullets only.
`.trim();

    const system =
      mode === 'name' ? systemName : mode === 'bio' ? systemBio : systemDescription;

    const user =
      mode === 'bio'
        ? `Refine this business bio (plain text only, same meaning, professional tone):\n\n${raw}`
        : `
Mode: ${mode}
Trade: ${trade || 'Unknown'}
Location: ${location || 'Unknown'}

User notes:
${raw}
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    let refined = completion.choices[0]?.message?.content?.trim() ?? '';

    if (mode === 'description') {
      refined = trimToConfirmSection(refined);
    }

    if (mode === 'bio') {
      // Plain text only — strip any accidental markdown
      refined = refined
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    if (mode === 'name') {
      const trades = splitTrades(trade);
      refined = appendTitleContext({
        title: refined,
        location,
        trades,
        maxLen: 90,
      });
    }

    return NextResponse.json({ success: true, refined });
  } catch (error: any) {
    console.error('REFINE TENDER ERROR:', error);
    return NextResponse.json({ success: false, error: error?.message ?? 'Unknown error' }, { status: 500 });
  }
}
