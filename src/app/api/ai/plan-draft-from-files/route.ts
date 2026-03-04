import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { openai } from '@/lib/ai/openai';
import type { TenderAIDraft } from '@/lib/ai/tender-draft-schema';

export const dynamic = 'force-dynamic';

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20 MB

function parseDraftJson(raw: string): TenderAIDraft | null {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as TenderAIDraft;
    return parsed;
  } catch {
    return null;
  }
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result?.text ?? '';
  } finally {
    await parser.destroy();
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files?.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    let totalBytes = 0;
    const pdfBuffers: { name: string; text: string }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) continue;

      totalBytes += file.size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json(
          { error: 'Total file size exceeds 20 MB limit' },
          { status: 400 }
        );
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const text = await extractTextFromPdf(buf);
      if (text?.trim()) {
        pdfBuffers.push({ name: file.name, text: text.trim() });
      }
    }

    if (pdfBuffers.length === 0) {
      return NextResponse.json(
        { error: 'No PDF text could be extracted. Ensure files are valid PDFs.' },
        { status: 400 }
      );
    }

    const combinedText = pdfBuffers
      .map((p) => `--- ${p.name} ---\n${p.text}`)
      .join('\n\n');

    const sys = `You are TradeHub's tender drafting assistant. Extract structured information from construction/renovation plans (PDF text).
Output ONLY valid JSON matching this schema (no markdown, no extra text):
{
  "project_name": "string or null",
  "summary": "string or null",
  "suggested_trades": ["string"],
  "confirmed_from_plans": ["string"],
  "questions_to_confirm": ["string"],
  "assumptions": ["string"],
  "inclusions": ["string"],
  "exclusions": ["string"],
  "timing_notes": ["string"],
  "site_access_notes": ["string"]
}

Rules:
- Be conservative: only put facts clearly stated in the plans into confirmed_from_plans.
- Put anything uncertain into questions_to_confirm or assumptions.
- suggested_trades: Australian trade names (e.g. Electrician, Plumber, Carpenter).
- Use Australian English and trade terminology.`;

    const user = `Extract tender draft from these plan documents:\n\n${combinedText.slice(0, 120000)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? '';
    const draft = parseDraftJson(raw);

    if (!draft) {
      return NextResponse.json(
        { error: 'AI could not produce a valid draft. Try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft });
  } catch (error: any) {
    console.error('[plan-draft-from-files]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to generate draft' },
      { status: 500 }
    );
  }
}
