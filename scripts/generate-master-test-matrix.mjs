import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checklistPath = path.join(root, 'docs', 'TRADEHUB_LAUNCH_CHECKLIST.md');
const outCsvPath = path.join(root, 'docs', 'TRADEHUB_MASTER_TEST_MATRIX.csv');

const text = fs.readFileSync(checklistPath, 'utf8');
const lines = text.split(/\r?\n/);

const sectionStatuses = new Map([
  ['1) Authentication and Session', 'CONFIRMED (partial)'],
  ['2) User Onboarding', 'MANUAL-GAP'],
  ['3) Account/Profile Management', 'COVERED-NOT-RUN'],
  ['4) ABN Verification', 'CONFIRMED (partial)'],
  ['5) Premium/Billing/Subscription', 'CONFIRMED (partial)'],
  ['6) Premium Feature Enforcement', 'CONFIRMED (partial)'],
  ['7) Location and Radius Logic', 'CONFIRMED (partial)'],
  ['8) Availability System', 'CONFIRMED (partial)'],
  ['9) Search/Discovery', 'COVERED-NOT-RUN'],
  ['10) Public Profiles', 'COVERED-NOT-RUN'],
  ['11) Messaging / Conversations', 'CONFIRMED (partial)'],
  ['12) Messaging Action Cards / Workflow Actions', 'COVERED-NOT-RUN'],
  ['13) Jobs', 'CONFIRMED (partial)'],
  ['14) Job Applications / Hiring Flow', 'MANUAL-GAP'],
  ['15) Tenders', 'CONFIRMED (partial)'],
  ['16) Reviews and Ratings', 'MANUAL-GAP'],
  ['17) Notifications', 'CONFIRMED (partial)'],
  ['18) Admin Functionality', 'CONFIRMED (partial)'],
  ['19) Route Guards and Permissions', 'CONFIRMED (partial)'],
  ['20) Supabase / Data Integrity / Guardrails', 'CONFIRMED (partial)'],
  ['21) File Uploads / Storage', 'COVERED-NOT-RUN'],
  ['22) UI/UX Behavior', 'COVERED-NOT-RUN'],
  ['23) Performance / Resilience', 'MANUAL-GAP'],
  ['24) SEO / Marketing Pages', 'COVERED-NOT-RUN'],
  ['25) Security / Abuse Prevention', 'CONFIRMED (partial)'],
  ['26) Cross-Browser / Device Coverage', 'MANUAL-GAP'],
  ['27) Release-Critical End-to-End Journeys', 'CONFIRMED (partial)'],
  ['28) Manual-only or Semi-manual Checks', 'MANUAL-GAP'],
]);

let currentSection = '';
let inNumberedSection = false;
const rows = [];
const sectionCounters = new Map();

for (const rawLine of lines) {
  const line = rawLine.trim();
  const sectionMatch = line.match(/^##\s+(\d+\)\s+.+)$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1];
    inNumberedSection = true;
    sectionCounters.set(currentSection, 0);
    continue;
  }
  if (line.startsWith('## ') && !sectionMatch) {
    inNumberedSection = false;
  }
  if (!inNumberedSection) continue;
  if (!line.startsWith('- [ ] ')) continue;

  const fn = line.replace(/^- \[ \]\s+/, '').trim();
  const idx = (sectionCounters.get(currentSection) ?? 0) + 1;
  sectionCounters.set(currentSection, idx);
  const caseId = `${currentSection.split(')')[0]}.${idx}`;
  const secStatus = sectionStatuses.get(currentSection) ?? 'NOT CONFIRMED';

  rows.push({
    id: caseId,
    feature: currentSection,
    fn,
    expected: 'Works as intended with correct guards and state handling.',
    free: 'TBD',
    premium: 'TBD',
    unverified: 'TBD',
    admin: 'TBD',
    automated: secStatus.includes('MANUAL') ? 'No/Partial' : 'Yes/Partial',
    manual: 'Required',
    passFail: secStatus,
    notes: '',
  });
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const header = [
  'Case ID',
  'Feature',
  'Function',
  'Expected behavior',
  'Free user',
  'Premium user',
  'Unverified user',
  'Admin',
  'Automated',
  'Manual',
  'Pass/Fail',
  'Notes',
];

const csv = [
  header.join(','),
  ...rows.map((r) =>
    [
      r.id,
      r.feature,
      r.fn,
      r.expected,
      r.free,
      r.premium,
      r.unverified,
      r.admin,
      r.automated,
      r.manual,
      r.passFail,
      r.notes,
    ]
      .map(csvEscape)
      .join(',')
  ),
].join('\n');

fs.writeFileSync(outCsvPath, csv, 'utf8');

console.log(`Generated ${rows.length} test rows at docs/TRADEHUB_MASTER_TEST_MATRIX.csv`);
