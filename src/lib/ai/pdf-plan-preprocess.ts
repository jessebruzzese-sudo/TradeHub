/**
 * PDF plan preprocessing pipeline: classify → rotate → OCR → group by dwelling.
 * Orchestrates page-level processing for difficult multi-sheet plan binders.
 */

import { getDocumentProxy, extractText, renderPageAsImage } from 'unpdf';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { classifyPlanPage, type PlanPageType } from './plan-page-classifier';
import { shouldTryRotatedOcr, pickBestOcrResult, type RotationDegrees } from './page-rotation-detection';

export type PlanPageAnalysis = {
  pageNumber: number;
  pageType: PlanPageType;
  rotation: RotationDegrees;
  ocrText: string;
  headingHints: string[];
  dwellingLabel: string | null;
  confidence: number;
};

const MAX_PAGES_ANALYZED = 12;
const WEAK_EMBEDDED_TEXT_THRESHOLD = 200;

async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return data?.text?.trim() ?? '';
  } finally {
    await worker.terminate();
  }
}

async function rotateImageBuffer(buffer: Buffer, degrees: 90 | 270): Promise<Buffer> {
  const rotated = await sharp(buffer)
    .rotate(degrees)
    .png()
    .toBuffer();
  return rotated;
}

/**
 * Preprocess a PDF: extract per-page text, render pages to images, OCR, classify, detect rotation.
 * Returns structured page analysis for up to MAX_PAGES_ANALYZED pages.
 */
export async function preprocessPdfPlan(
  buffer: Buffer,
  fileName: string
): Promise<{
  pages: PlanPageAnalysis[];
  totalPages: number;
  embeddedTextLimited: boolean;
}> {
  console.log('[generate-from-plans] file start', { fileName });

  const uint8 = new Uint8Array(buffer);
  const pdfDoc = await getDocumentProxy(uint8);

  const { totalPages, text: mergedText } = await extractText(pdfDoc, { mergePages: true });
  const embeddedTextLimited = !mergedText || mergedText.length < WEAK_EMBEDDED_TEXT_THRESHOLD;

  if (totalPages === 0) {
    console.log('[generate-from-plans] PDF has no pages');
    return { pages: [], totalPages: 0, embeddedTextLimited };
  }

  const pagesToProcess = Math.min(totalPages, MAX_PAGES_ANALYZED);
  const pages: PlanPageAnalysis[] = [];

  for (let p = 1; p <= pagesToProcess; p++) {
    try {
      console.log('[generate-from-plans] OCR page start', { pageNumber: p });

      const imgBuffer = await renderPageAsImage(pdfDoc, p, { scale: 1.2 });
      const buf = Buffer.from(imgBuffer);

      let ocrText = await ocrImageBuffer(buf);
      let rotation: RotationDegrees = 0;

      if (shouldTryRotatedOcr(ocrText)) {
        const results: { rotation: RotationDegrees; ocrText: string }[] = [
          { rotation: 0, ocrText },
        ];

        try {
          const rotated90 = await rotateImageBuffer(buf, 90);
          const ocr90 = await ocrImageBuffer(rotated90);
          results.push({ rotation: 90, ocrText: ocr90 });
        } catch {
          // skip
        }
        try {
          const rotated270 = await rotateImageBuffer(buf, 270);
          const ocr270 = await ocrImageBuffer(rotated270);
          results.push({ rotation: 270, ocrText: ocr270 });
        } catch {
          // skip
        }

        const best = pickBestOcrResult(results);
        ocrText = best.ocrText;
        rotation = best.rotation;
        console.log('[generate-from-plans] OCR page result', {
          pageNumber: p,
          textLength: best.textLength,
          rotation,
        });
      } else {
        console.log('[generate-from-plans] OCR page result', {
          pageNumber: p,
          textLength: ocrText.length,
          rotation: 0,
        });
      }

      const classification = classifyPlanPage(ocrText);
      const headingHints = extractHeadingHints(ocrText);
      const dwellingLabel = extractDwellingLabelFromText(ocrText);

      pages.push({
        pageNumber: p,
        pageType: classification.pageType,
        rotation,
        ocrText,
        headingHints,
        dwellingLabel,
        confidence: classification.confidence,
      });
    } catch (err) {
      console.error('[generate-from-plans] page preprocess failed', { pageNumber: p, error: err });
    }
  }

  console.log('[generate-from-plans] classified pages', {
    count: pages.length,
    types: pages.map((p) => ({ p: p.pageNumber, type: p.pageType, conf: p.confidence })),
  });

  return {
    pages,
    totalPages,
    embeddedTextLimited,
  };
}

function extractHeadingHints(text: string): string[] {
  if (!text?.trim()) return [];
  const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 120);
  return lines.slice(0, 5);
}

function extractDwellingLabelFromText(text: string): string | null {
  if (!text) return null;
  const m = text.match(/\b(dwelling\s+\d+[a-z]?|unit\s+\d+[a-z]?|residence\s+[a-z])\b/i);
  return m ? m[1].trim() : null;
}
