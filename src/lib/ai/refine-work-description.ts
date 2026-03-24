/**
 * Client helper: calls the server-side refine endpoint (OpenAI runs on the API route only).
 */
export async function refineWorkDescription(args: {
  text: string;
  trade?: string | null;
}): Promise<string> {
  const res = await fetch('/api/ai/refine-work-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      text: args.text,
      ...(args.trade ? { trade: args.trade } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : 'Refinement failed';
    throw new Error(msg);
  }

  return typeof data?.refined === 'string' ? data.refined : '';
}
