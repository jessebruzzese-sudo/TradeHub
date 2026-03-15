/**
 * Stormwater and roof drainage detection from construction plan text.
 */

export type DrainageDetection = {
  hasStormwater: boolean;
  hasDownpipes: boolean;
  hasGutters: boolean;
  hasRainwater: boolean;
  detectedDrainageSignals: string[];
};

const DRAINAGE_SIGNALS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bDP\b/i, label: 'DP' },
  { pattern: /\bdownpipe\b/i, label: 'Downpipe' },
  { pattern: /\bdown\s*pipe\b/i, label: 'Downpipe' },
  { pattern: /\bstormwater\b/i, label: 'Stormwater' },
  { pattern: /\bstorm\s*water\b/i, label: 'Stormwater' },
  { pattern: /\bgutter\b/i, label: 'Gutter' },
  { pattern: /\brainwater\b/i, label: 'Rainwater' },
  { pattern: /\brain\s*water\b/i, label: 'Rainwater' },
  { pattern: /\brain\s*head\b/i, label: 'Rain head' },
  { pattern: /\brainwater\s*head\b/i, label: 'Rainwater head' },
  { pattern: /\blpodd?\b/i, label: 'LPOD' },
  { pattern: /\blegal\s+point\s+of\s+discharge\b/i, label: 'LPOD' },
];

/**
 * Detect stormwater and roof drainage signals from plan text.
 */
export function detectDrainageFromPlanText(text: string): DrainageDetection {
  if (!text || typeof text !== 'string') {
    return {
      hasStormwater: false,
      hasDownpipes: false,
      hasGutters: false,
      hasRainwater: false,
      detectedDrainageSignals: [],
    };
  }

  const signals: string[] = [];
  for (const { pattern, label } of DRAINAGE_SIGNALS) {
    if (pattern.test(text) && !signals.includes(label)) {
      signals.push(label);
    }
  }

  const lower = text.toLowerCase();
  const hasStormwater = signals.some((s) => s.toLowerCase().includes('storm'));
  const hasDownpipes = signals.some((s) => s.toLowerCase().includes('downpipe') || s === 'DP');
  const hasGutters = signals.some((s) => s.toLowerCase().includes('gutter'));
  const hasRainwater = signals.some((s) => s.toLowerCase().includes('rain'));

  return {
    hasStormwater,
    hasDownpipes,
    hasGutters,
    hasRainwater,
    detectedDrainageSignals: signals,
  };
}
