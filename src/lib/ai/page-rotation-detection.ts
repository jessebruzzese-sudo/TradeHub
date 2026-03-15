/**
 * Page rotation detection for plan OCR.
 * When OCR text is weak in current orientation, tries rotated versions
 * and returns the best result.
 */

export type RotationDegrees = 0 | 90 | 180 | 270;

export type RotationResult = {
  rotation: RotationDegrees;
  ocrText: string;
  textLength: number;
};

/** Minimum text length to consider OCR "strong" - below this we try rotations. */
const WEAK_OCR_THRESHOLD = 80;

/**
 * Given OCR text from upright orientation, decide if we should try rotated OCR.
 * Returns true when text is very weak (suggests page may be sideways).
 */
export function shouldTryRotatedOcr(ocrText: string): boolean {
  const len = (ocrText ?? '').trim().length;
  return len < WEAK_OCR_THRESHOLD;
}

/**
 * Choose the best OCR result from multiple orientations.
 * Prefers the one with the most readable text (longer, more word-like).
 */
export function pickBestOcrResult(
  results: { rotation: RotationDegrees; ocrText: string }[]
): RotationResult {
  if (!results?.length) {
    return { rotation: 0, ocrText: '', textLength: 0 };
  }

  const scored = results.map((r) => {
    const text = (r.ocrText ?? '').trim();
    const words = text.split(/\s+/).filter((w) => w.length > 1);
    const wordCount = words.length;
    const charCount = text.length;
    // Prefer text with more words and reasonable length (not gibberish)
    const score = wordCount * 2 + Math.min(charCount, 500);
    return { ...r, textLength: charCount, score };
  });

  const best = scored.reduce((a, b) => (a.score >= b.score ? a : b));
  return {
    rotation: best.rotation,
    ocrText: best.ocrText ?? '',
    textLength: best.textLength,
  };
}
