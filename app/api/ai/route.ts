import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Msg = { role: "system" | "user" | "assistant"; content: string };

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function nowDayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const inMemoryUserState = new Map<
  string,
  { lastAt: number; dayKey: string; count: number }
>();

function checkRateLimit(userId: string) {
  const COOLDOWN_MS = 2500;
  const DAILY_CAP = 60;

  const st = inMemoryUserState.get(userId) ?? {
    lastAt: 0,
    dayKey: nowDayKey(),
    count: 0,
  };

  const dayKey = nowDayKey();
  if (st.dayKey !== dayKey) {
    st.dayKey = dayKey;
    st.count = 0;
    st.lastAt = 0;
  }

  const now = Date.now();
  if (now - st.lastAt < COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" as const };
  }
  if (st.count >= DAILY_CAP) {
    return { ok: false, reason: "daily_cap" as const };
  }

  st.lastAt = now;
  st.count += 1;
  inMemoryUserState.set(userId, st);

  return { ok: true };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server missing OPENAI_API_KEY env var. Add it to .env file or environment settings." },
        { status: 500 }
      );
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid or empty JSON body sent to /api/ai." },
        { status: 400 }
      );
    }

    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    const userId = body?.userId ?? "anon";
    const rl = checkRateLimit(userId);
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.reason === "cooldown" ? "Please wait a moment." : "Daily AI limit reached." },
        { status: 429 }
      );
    }

    const mode = body?.mode ?? "general";

    const system: Msg = {
      role: "system",
      content: [
        "You are TradeHub AI, an assistant inside an Australian trades subcontractor marketplace.",
        "You help users draft tenders, write quote replies, suggest message responses, and explain platform rules.",
        "",
        "Hard rules:",
        "- Do NOT invent facts, pricing, laws, or user data. If missing info, ask 1–3 short questions.",
        "- Do NOT provide illegal, harmful, or unsafe instructions.",
        "- Keep responses practical and concise. Prefer bullet points.",
        "",
        "TradeHub product rules:",
        "- Distance/radius limits must be framed as quality and relevance, not punishment or restriction.",
        "- Late cancellation reviews are called 'Reliability review (late cancellation)' and cover reliability/communication only (not workmanship).",
        "",
        `Current mode: ${mode}`,
        "Mode behavior:",
        "- tender_draft: return Title, Summary, Scope bullets, Required trades, Dates, and Questions for quoting.",
        "- reply_suggest: return 3 short reply options (Friendly / Firm / Very brief).",
        "- quote_helper: return a quote message template with placeholders (no made-up exact prices).",
      ].join("\n"),
    };

    const ctx =
      body?.context != null
        ? ({
            role: "system",
            content: `Context (may be incomplete): ${JSON.stringify(body.context)}`,
          } as Msg)
        : null;

    const input: Msg[] = [system, ...(ctx ? [ctx] : []), ...messages];

    const client = getOpenAIClient();
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: input.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 1000,
    });

    const text =
      resp.choices[0]?.message?.content ?? "Sorry — I couldn't generate a response. Please try again.";

    return NextResponse.json({ message: { role: "assistant", content: text } });
  } catch (err: any) {
    console.error("AI route error:", err?.message || err);
    return NextResponse.json(
      { error: `AI request failed: ${err?.message || "unknown error"}` },
      { status: 500 }
    );
  }
}
