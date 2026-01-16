export type AiMode = "tender_draft" | "reply_suggest" | "quote_helper" | "general";
export type AiMsg = { role: "user" | "assistant"; content: string };

export async function callTradeHubAI(args: {
  userId: string;
  mode: AiMode;
  messages: AiMsg[];
  context?: any;
}) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: args.userId,
      mode: args.mode,
      messages: args.messages,
      context: args.context ?? null,
    }),
  });

  const raw = await res.text();

  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      `AI request failed (${res.status}). Raw response:\n${raw || "(empty response)"}`;
    throw new Error(msg);
  }

  if (!data?.message) {
    throw new Error(
      `Invalid AI response. Raw response:\n${raw || "(empty response)"}`
    );
  }

  return data.message as AiMsg;
}
