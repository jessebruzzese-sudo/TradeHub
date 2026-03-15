import { NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';
import { createWorker } from 'tesseract.js';
import { TRADE_CATEGORIES } from '@/lib/trades';
import { openai } from '@/lib/ai/openai';
import { inferTradesFromPlanText } from '@/lib/ai/plan-trade-inference';
import { cleanTenderDraft } from '@/lib/ai/clean-tender-draft';
import type { TenderAIDraft } from '@/lib/ai/tender-draft-schema';
import { preprocessPdfPlan } from '@/lib/ai/pdf-plan-preprocess';
import { groupPagesByDwelling } from '@/lib/ai/plan-dwelling-grouping';
import { buildPlanAIContext } from '@/lib/ai/build-plan-ai-context';

export const dynamic = 'force-dynamic';

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20 MB

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isImage(file: File): boolean {
  const t = file.type?.toLowerCase() ?? '';
  const n = file.name?.toLowerCase() ?? '';
  return (
    t.includes('image/') ||
    n.endsWith('.jpg') ||
    n.endsWith('.jpeg') ||
    n.endsWith('.png')
  );
}

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
  const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdfDoc, { mergePages: true });
  return text ?? '';
}

async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return data?.text?.trim() ?? '';
  } finally {
    await worker.terminate();
  }
}

export async function POST(req: Request) {
  try {
    console.log('[plan-draft-from-files] start');
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    console.log('[plan-draft-from-files] received files', files?.length ?? 0, files?.map((f) => f?.name));

    if (!files?.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const validFiles = files.filter(
      (f) => f instanceof File && (isPdf(f) || isImage(f))
    );

    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: 'Provide PDF or image files (JPG, PNG)' },
        { status: 400 }
      );
    }

    if (validFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    let totalBytes = 0;
    const fileNames: string[] = [];
    const textParts: { name: string; text: string }[] = [];

    for (const file of validFiles) {
      totalBytes += file.size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json(
          { error: 'Total file size exceeds 20 MB limit' },
          { status: 400 }
        );
      }
      fileNames.push(file.name);
    }

    let extractedText = '';
    let ocrText = '';
    let pdfTextLimited = false;
    let preprocessedPages: Awaited<ReturnType<typeof preprocessPdfPlan>>['pages'] = [];
    let preprocessedEmbeddedLimited = false;

    for (const file of validFiles) {
      try {
        const buf = Buffer.from(await file.arrayBuffer());

        if (isPdf(file)) {
          let pdfText = '';
          try {
            pdfText = await extractTextFromPdf(buf);
          } catch (extractErr) {
            console.warn('[generate-from-plans] PDF embedded text extraction failed, will try OCR', file.name, extractErr);
          }
          if (pdfText?.trim()) {
            extractedText += (extractedText ? '\n\n' : '') + `--- ${file.name} ---\n${pdfText.trim()}`;
          }
          const limited = !pdfText || pdfText.length < 200;
          if (limited) pdfTextLimited = true;

          if (limited && preprocessedPages.length === 0) {
            try {
              const result = await preprocessPdfPlan(buf, file.name);
              preprocessedPages = result.pages;
              preprocessedEmbeddedLimited = result.embeddedTextLimited;
              console.log('[generate-from-plans] preprocessed PDF pages', result.pages.length, 'of', result.totalPages);
            } catch (preErr) {
              console.warn('[generate-from-plans] PDF preprocess failed, using embedded text only', preErr);
            }
          }
        } else if (isImage(file)) {
          const imgOcr = await ocrImageBuffer(buf);
          if (imgOcr?.trim()) {
            ocrText += (ocrText ? '\n\n' : '') + `--- ${file.name} ---\n${imgOcr.trim()}`;
          }
        }
      } catch (extractErr) {
        console.warn('[generate-from-plans] extraction failed for', file.name, extractErr);
      }
    }

    const dwellingGroups = preprocessedPages.length > 0 ? groupPagesByDwelling(preprocessedPages) : [];
    console.log('[generate-from-plans] dwelling groups', dwellingGroups.map((g) => ({ label: g.dwellingLabel, pages: g.pages.length })));

    const pdfOcrText = preprocessedPages
      .map((p) => p.ocrText)
      .filter(Boolean)
      .join('\n\n');
    let combinedPlanText =
      preprocessedPages.length > 0
        ? [extractedText, pdfOcrText, ocrText].filter(Boolean).join('\n\n')
        : [extractedText, ocrText].filter(Boolean).join('\n\n');

    console.log('[generate-from-plans] embedded text length', extractedText.length);
    console.log('[generate-from-plans] PDF OCR text length', pdfOcrText.length);
    console.log('[generate-from-plans] image OCR text length', ocrText.length);
    console.log('[generate-from-plans] combined text length', combinedPlanText.length);

    if (!combinedPlanText.trim()) {
      const fallbackParts: string[] = [];
      if (preprocessedPages.length > 0) {
        const pageTypes = [...new Set(preprocessedPages.map((p) => p.pageType))].filter((t) => t !== 'unknown');
        const headings = preprocessedPages.flatMap((p) => p.headingHints).filter(Boolean).slice(0, 10);
        if (pageTypes.length > 0 || headings.length > 0) {
          fallbackParts.push(
            `Architectural plan set detected. Page types: ${pageTypes.join(', ') || 'mixed'}.`,
            headings.length > 0 ? `Headings: ${headings.join('; ')}` : ''
          );
        }
      }
      if (fileNames.length > 0) {
        fallbackParts.push(`Files: ${fileNames.join(', ')}.`);
      }
      if (fallbackParts.length > 0) {
        combinedPlanText = fallbackParts.filter(Boolean).join(' ');
        console.log('[generate-from-plans] using fallback context', combinedPlanText.slice(0, 200));
      }
    }

    if (!combinedPlanText.trim()) {
      return NextResponse.json(
        { error: 'No text could be extracted from the plans. Ensure files are valid PDFs or images with readable content.' },
        { status: 400 }
      );
    }

    const inferredTrades = inferTradesFromPlanText(combinedPlanText);
    console.log('[generate-from-plans] inferred trades', inferredTrades.map((t) => ({ trade: t.trade, confidence: t.confidence })));

    const { detectRoomsFromPlanText, detectBuildingElements } = await import('@/lib/ai/plan-room-detection');
    const { detectDrainageFromPlanText } = await import('@/lib/ai/plan-drainage-detection');
    const roomCounts = detectRoomsFromPlanText(combinedPlanText);
    const building = detectBuildingElements(combinedPlanText);
    const drainage = detectDrainageFromPlanText(combinedPlanText);

    const planContext =
      preprocessedPages.length > 0
        ? buildPlanAIContext(
            preprocessedPages,
            dwellingGroups,
            roomCounts,
            building,
            drainage,
            inferredTrades,
            extractedText,
            ocrText
          )
        : null;

    if (planContext) {
      const ps = planContext.projectStructure;
      console.log('[generate-from-plans] dwelling groups', dwellingGroups.map((g) => g.dwellingLabel));
      console.log('[generate-from-plans] dwelling storeys', ps.dwellingStoreys);
      console.log('[generate-from-plans] project structure', { dwellingCount: ps.dwellingCount, likelyStoreyLabel: ps.likelyStoreyLabel, dwellingStoreys: ps.dwellingStoreys.map((s) => ({ label: s.dwellingLabel, floors: s.floors })) });
      console.log('[generate-from-plans] selected pages for AI', planContext.pageSummary);
      console.log('[generate-from-plans] final context summary', {
        dwellingGroups: planContext.dwellingGroups.length,
        ignoredTypes: planContext.ignoredPageTypes,
        combinedLength: planContext.combinedText.length,
      });
    }

    const inferredContext =
      inferredTrades.length > 0
        ? `\n\nInferred trade hints from plan keywords (use these to guide your suggestions):\n${JSON.stringify(
            inferredTrades.map((t) => ({ trade: t.trade, confidence: t.confidence, evidence: t.evidence }))
          )}`
        : '';

    const { inferLocationFromPlanText } = await import('@/lib/ai/plan-location-inference');
    const inferredLocation = inferLocationFromPlanText(combinedPlanText);
    const locationHint = inferredLocation
      ? `\n\nInferred location from plan text (use to populate detected_location if consistent): ${JSON.stringify(inferredLocation)}`
      : '';
    const roomHint =
      roomCounts.bathrooms > 0 || roomCounts.ensuites > 0 || roomCounts.kitchens > 0 || roomCounts.laundries > 0
        ? `\n\nDetected wet areas: ${JSON.stringify(roomCounts)}. Use these counts in Plumbing scope (e.g. "Plumbing rough-in to 2 bathrooms, 1 ensuite, kitchen and laundry including sanitary drainage and hot water").`
        : '';
    const _dwellingCountForHint = planContext?.detectedDwellingCount ?? 1;
    const _projectStructureForHint = planContext?.projectStructure;
    const storeyLabelForBuilding =
      _dwellingCountForHint >= 2 && _projectStructureForHint?.likelyStoreyLabel === 'mixed/uncertain'
        ? `${_dwellingCountForHint} residential dwellings (storey evidence incomplete)`
        : _dwellingCountForHint >= 2 && !_projectStructureForHint?.likelyStoreyLabel
          ? `${_dwellingCountForHint} residential dwellings (storey evidence incomplete)`
          : _dwellingCountForHint >= 2 && _projectStructureForHint?.likelyStoreyLabel
            ? _projectStructureForHint.likelyStoreyLabel === 'triple storey'
              ? 'triple storey dwellings'
              : _projectStructureForHint.likelyStoreyLabel === 'double storey'
                ? 'double storey dwellings'
                : _projectStructureForHint.likelyStoreyLabel === 'single storey' && _projectStructureForHint?.hasStrongSingleStoreyEvidence
                  ? 'single storey dwellings'
                  : `${_dwellingCountForHint} residential dwellings`
            : building.floors >= 3 ? 'triple storey dwelling' : building.floors === 2 ? 'double storey dwelling' : 'single storey dwelling';
    const storeyHintSuffix =
      _dwellingCountForHint >= 2 && (_projectStructureForHint?.likelyStoreyLabel === 'mixed/uncertain' || !_projectStructureForHint?.likelyStoreyLabel)
        ? ' Storey evidence is incomplete; use neutral wording: "residential dwellings" or "2 dwellings". Do NOT assume single storey.'
        : _dwellingCountForHint >= 2 && _projectStructureForHint?.likelyStoreyLabel
          ? ` Use ${storeyLabelForBuilding} in the description.`
          : building.floors >= 2 ? ' Use for Electrical/Carpentry scope when double storey.' : ' This is a single storey dwelling – do not describe as two-storey or double storey.';
    const buildingHint =
      building.floors >= 2 || building.hasGarage || building.hasAlfresco || _dwellingCountForHint >= 2
        ? `\n\nDetected building: ${storeyLabelForBuilding}, garage: ${building.hasGarage}, alfresco: ${building.hasAlfresco}, roof plan: ${building.hasRoofPlan}.${storeyHintSuffix}`
        : '';
    console.log('[generate-from-plans] building detection', { floors: building.floors, hasGroundFloor: building.hasGroundFloor, hasFirstFloor: building.hasFirstFloor, hasSecondFloor: building.hasSecondFloor });
    console.log('[generate-from-plans] building hint', buildingHint.trim() || '(none)');
    const drainageHint =
      drainage.hasStormwater || drainage.hasDownpipes || drainage.hasGutters
        ? `\n\nDetected drainage: stormwater/downpipes/gutters. Consider adding "Roof plumbing / stormwater" trade with scope: gutters, downpipes and stormwater drainage to LPOD.`
        : '';

    const sys = `You are assisting a builder preparing a subcontractor tender from residential building plans. Think like an estimator or builder reviewing a set of plans before sending packages to subcontractors.

Important rules:
1. Identify ALL relevant trade packages reasonably supported by the plans, not just the most obvious 3–5 trades.
2. Some plan sets contain multiple dwellings – prioritize architectural, electrical, roof and site sheets; ignore low-value repetitive detail pages unless they materially affect trade inference.
3. Prefer a full residential trade breakdown where evidence supports it.
4. Include trades even if their scope is secondary, as long as they are plausibly required for this build.
5. Do not invent highly specific scope that is not supported by the plans.
6. Write trade scopes like a builder requesting quotes from subcontractors.
7. Keep each scope concise, practical, and subcontractor-ready.
8. AVOID vague phrases: "general works", "as required", "etc", "scope to be confirmed".
9. If evidence is weak, still provide the most likely practical scope, but reduce confidence.
10. Return between 6 and 15 trade packages when supported by the plans.
11. Prefer standard Australian residential construction trade categories.

ALLOWED TRADES (you MUST use ONLY these exact names – no variations, no new categories):
${TRADE_CATEGORIES.map((t) => `- ${t}`).join('\n')}

CRITICAL trade rules:
- Only use trade names from the allowed list above. Copy them exactly.
- Do NOT invent, rename, merge, split, or approximate trade categories.
- If no suitable trade exists in the list, omit it rather than creating a new one.
- Do NOT use "Wall Linings", "Interior Finishes", "Bathroom Finishes", "Masonry", "Roof plumbing" (use "Roof plumbing / stormwater"), or similar variants.

Output ONLY valid JSON (no markdown):
{
  "project_name": "string",
  "project_description": "string",
  "detected_dwelling_count": 1 or 2 or more (number of dwellings detected when multi-dwelling),
  "suggested_trades_with_scope": [
    {
      "trade": "string",
      "scope": "string",
      "confidence": 0.0,
      "evidence": ["string"]
    }
  ],
  "estimated_duration_days": 0,
  "notes": "string",
  "detected_location": {
    "address_text": "string or null",
    "suburb": "string or null",
    "postcode": "string or null",
    "state": "string or null",
    "confidence": 0.0 to 1.0
  }
}

suggested_trades_with_scope rules:
- Include only distinct trade packages. No duplicate trades.
- Sort from highest confidence to lowest confidence.
- Use realistic trade names. Each scope: 1–3 sentences max.
- Reference rooms, floors, wet areas, roof drainage, framing, garage, alfresco, or other building elements when known.

Examples of good scopes (single dwelling):
Plumbing: "Supply and install sanitary plumbing, drainage, floor wastes and hot water service to bathrooms, ensuite, kitchen and laundry as per plans."
Electrical: "Electrical rough-in and fit-off including lighting, power, smoke alarms and data points throughout the dwelling as per electrical layout."
Carpentry: "Timber wall and roof framing including internal structural framing, roof framing and general carpentry associated with the dwelling."

Examples for multi-dwelling (when 2+ dwellings detected):
Plumbing: "Plumbing rough-in to wet areas, kitchens and laundries across both dwellings including sanitary drainage, floor wastes and hot water service." 
Electrical: "Electrical rough-in and fit-off across both dwellings including lighting, power, smoke alarms and data points throughout the dwelling as per electrical layout."
Carpentry: "Timber framing and associated carpentry works across both dwellings including wall framing, roof framing and structural members."
Roof plumbing / stormwater: "Install gutters, downpipes and stormwater drainage connected to the legal point of discharge as shown on plans."
Waterproofing: "Waterproof membrane installation to bathrooms, ensuite and other wet areas prior to tiling."
Tiling: "Wall and floor tiling to bathrooms, ensuite and other nominated wet areas, including shower areas and splashbacks where applicable."
Cabinet making / joinery: "Supply and install kitchen, vanity and other built-in joinery items shown on plans."
Painting: "Prepare and paint internal and external building surfaces following completion of plastering, cladding and trim works."

Location: Extract from titles, site details, permit notes, drawing title blocks. Prefer suburb + postcode + state. Do NOT stuff full address into project_name.
Project name: Short (max ~80 chars). For single dwelling: "New dwelling – Aloe Court" or "New dwelling – South Morang". For multi-dwelling: "Residential works – 2 dwellings, Pleasant Road" or "New build – 2 dwellings, Bulleen". Avoid "Project Works", "Construction project".
Project description: One short professional paragraph. No marketing, no "please quote accordingly". CRITICAL: If the plan set contains multiple dwellings, project_name and description MUST reflect that. Prefer "Residential works across 2 double-storey dwellings" or "This tender relates to construction works across 2 dwellings in Bulleen...". Do NOT collapse clearly multi-dwelling projects into "a single residential dwelling". Use the Detected building storey label when provided. For multi-dwelling with double-storey evidence: say "double-storey" or "two-storey".
Notes: Only when useful (weak extraction, low confidence). When PDF text limited: "Plan text was limited, so this is a best-effort draft based on extracted text and plan keywords."

Trade names: Use ONLY the allowed list above. Copy each name exactly.

Your output should feel like a real tender package list prepared by a builder, not a generic AI summary.`;

    const limitedHint = pdfTextLimited
      ? '\n\nNote: PDF embedded text was limited. Use the inferred trade hints and any extracted text to produce a best-effort draft. Include a note in the response.'
      : '';

    const dwellingCount = planContext?.detectedDwellingCount ?? 1;
    const projectStructure = planContext?.projectStructure;
    const storeyLabelForPrompt = projectStructure?.likelyStoreyLabel ?? projectStructure?.storeyLabel ?? (building.floors >= 2 ? 'double storey' : 'single storey');
    const dwellingStoreyHint =
      dwellingCount >= 2 && projectStructure?.dwellingStoreys?.length
        ? `\n\nDwelling groups detected:\n${projectStructure.dwellingStoreys
            .filter((s) => !['Unassigned', 'Main'].includes(s.dwellingLabel))
            .map((s) => `- ${s.dwellingLabel}: ${s.hasGroundFloorPlan && s.hasFirstFloorPlan ? 'ground floor + first floor plans' : s.floors === 1 ? 'single storey' : `${s.floors} storeys`}`)
            .join('\n')}\n\n${projectStructure.likelyStoreyLabel === 'mixed/uncertain' ? 'Storey evidence is partially incomplete; do NOT assume single-storey unless clearly supported. Use neutral wording: "residential works across 2 dwellings".' : `This indicates ${dwellingCount} ${projectStructure.likelyStoreyLabel} dwellings.`}`
        : '';
    const multiDwellingHint =
      dwellingCount >= 2
        ? `\n\nMULTI-DWELLING: This plan set appears to contain ${dwellingCount} dwellings (${planContext?.detectedDwellingLabels?.join(', ') ?? 'grouped'}). Grouped page analysis indicates these dwellings are likely ${storeyLabelForPrompt}. When supported by the grouped plans, the project description MUST mention dwelling count and storey count. Do NOT describe the project as a single dwelling. Where relevant, write scopes to reflect works across multiple dwellings (e.g. "across both dwellings", "to wet areas in each dwelling").`
        : '';

    const dwellingSummaryBlock =
      planContext && planContext.dwellingSummaryLines.length > 0
        ? `\n\nDwelling summaries (by page type):\n${planContext.dwellingSummaryLines.map((l) => `- ${l}`).join('\n')}`
        : '';

    const structuredContext = planContext
      ? `\n\nStructured plan context (prioritized pages):\nPage summary: ${planContext.pageSummary}\nProject hints: ${planContext.projectHints.join('; ')}\nDwelling groups: ${planContext.dwellingGroups.map((g) => `${g.label} (${g.pageTypes.join(', ')})`).join('; ')}${dwellingSummaryBlock}\nIgnored page types (lower priority): ${planContext.ignoredPageTypes.join(', ') || 'none'}\n\n--- Combined extracted/OCR text (prioritized) ---\n${planContext.combinedText.slice(0, 100000)}`
      : `\n--- Extracted text ---\n${extractedText.slice(0, 80000)}\n\n--- OCR text (if any) ---\n${ocrText.slice(0, 40000)}`;

    const user = `Extract tender draft from these plan documents.

File names: ${fileNames.join(', ')}
${limitedHint}
${multiDwellingHint}
${dwellingStoreyHint}
${locationHint}
${roomHint}
${buildingHint}
${drainageHint}
${structuredContext}
${inferredContext}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' } as { type: 'json_object' },
    });

    const raw = completion.choices?.[0]?.message?.content ?? '';
    const parsed = parseDraftJson(raw);

    if (!parsed) {
      return NextResponse.json(
        { error: 'AI could not produce a valid draft. Try again.' },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[plan-draft-from-files] AI generated trades:', parsed.suggested_trades_with_scope?.map((t) => t.trade) ?? []);
    }
    console.log('[generate-from-plans] raw draft', {
      project_name: parsed.project_name,
      suggested_trades: parsed.suggested_trades_with_scope?.map((t) => t.trade),
    });

    const { draft, fallbackScopesApplied, tradesPruned } = cleanTenderDraft(
      parsed as TenderAIDraft,
      inferredTrades,
      combinedPlanText,
      pdfTextLimited,
      dwellingCount,
      {
        detectedDwellingLabels: planContext?.detectedDwellingLabels,
        storeyEvidenceSupportsDouble: (projectStructure?.likelyStoreysPerDwelling ?? 0) >= 2,
        likelyStoreyLabel: projectStructure?.likelyStoreyLabel,
        hasStrongSingleStoreyEvidence: projectStructure?.hasStrongSingleStoreyEvidence ?? false,
      }
    );

    console.log('[generate-from-plans] detectedDwellingCount', dwellingCount);
    console.log('[generate-from-plans] dwellingStoreys', projectStructure?.dwellingStoreys);
    console.log('[generate-from-plans] likelyStoreyLabel', projectStructure?.likelyStoreyLabel);
    console.log('[generate-from-plans] final description', draft.project_description?.slice(0, 150));
    console.log('[generate-from-plans] final summary', draft.plan_summary?.summaryItems);

    console.log('[generate-from-plans] cleaned draft', {
      project_name: draft.project_name,
      suggested_trades: draft.suggested_trades,
    });
    if (fallbackScopesApplied.length > 0) {
      console.log('[generate-from-plans] fallback scopes applied', fallbackScopesApplied);
    }
    if (tradesPruned.length > 0) {
      console.log('[generate-from-plans] trades pruned', tradesPruned);
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[plan-draft-from-files] validated trades kept:', draft.suggested_trades_with_scope?.map((t) => t.trade) ?? []);
    }

    console.log('[plan-draft-from-files] returning draft');
    return NextResponse.json({ draft });
  } catch (error: unknown) {
    console.error('[plan-draft-from-files] failed', error);
    return NextResponse.json(
      { error: (error as Error)?.message ?? 'Failed to generate draft' },
      { status: 500 }
    );
  }
}
