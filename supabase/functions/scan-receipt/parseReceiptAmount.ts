/**
 * Receipt amount parser (Edge Function runtime source of truth).
 * Keep logic in sync with: src/utils/parseReceiptAmount.ts
 */
export interface ReceiptAmountCandidate {
  label: string;
  amountCents: number;
  rawText: string;
  score: number;
}

export interface ReceiptAmountParseResult {
  detectedAmountCents: number | null;
  detectedAmountText: string | null;
  candidates: ReceiptAmountCandidate[];
  confidence?: number;
}

const IGNORE_KEYWORDS = [
  'subtotal',
  'sub total',
  'tax',
  'tip',
  'gratuity',
  'change',
  'cash',
  'debit',
  'credit',
  'visa',
  'mastercard',
  'amex',
  'paid',
  'payment',
];

const KEYWORD_WEIGHTS: { keyword: string; score: number; label: string }[] = [
  { keyword: 'grand total', score: 130, label: 'grand total' },
  { keyword: 'total cad', score: 125, label: 'total cad' },
  { keyword: 'amount due', score: 120, label: 'amount due' },
  { keyword: 'balance due', score: 118, label: 'balance due' },
  { keyword: 'balance', score: 100, label: 'balance' },
  { keyword: 'total', score: 95, label: 'total' },
];

const AMOUNT_PATTERN = /(?:cad\s*)?\$?\s*([0-9]{1,5}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]{1,5}\.[0-9]{2})/gi;

function toCents(raw: string): number | null {
  const normalized = raw.replace(/,/g, '');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  const cents = Math.round(value * 100);
  return cents > 0 && cents <= 10_000_000 ? cents : null;
}

function lineIsIgnored(line: string): boolean {
  const normalized = line.toLowerCase();
  return IGNORE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function keywordScore(line: string): { score: number; label: string } | null {
  if (lineIsIgnored(line)) {
    return null;
  }
  const normalized = line.toLowerCase();
  return KEYWORD_WEIGHTS.find((entry) => normalized.includes(entry.keyword)) ?? null;
}

function lineCandidates(line: string, lineIndex: number): ReceiptAmountCandidate[] {
  const keyword = keywordScore(line);
  const candidates: ReceiptAmountCandidate[] = [];
  const matches = line.matchAll(AMOUNT_PATTERN);

  for (const match of matches) {
    const rawAmount = match[1];
    const amountCents = rawAmount ? toCents(rawAmount) : null;
    if (!amountCents) {
      continue;
    }

    candidates.push({
      label: keyword?.label ?? 'amount',
      amountCents,
      rawText: match[0].trim(),
      score: (keyword?.score ?? 10) + Math.max(0, 30 - lineIndex),
    });
  }

  return candidates;
}

export function parseReceiptAmount(rawText: string): ReceiptAmountParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = lines.flatMap((line, index) => lineCandidates(line, index));
  const totalCandidates = candidates.filter((candidate) => candidate.score >= 90);
  const ranked = [...(totalCandidates.length > 0 ? totalCandidates : candidates)].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.amountCents - a.amountCents;
  });

  const fallback =
    candidates.length > 0
      ? [...candidates].sort((a, b) => b.amountCents - a.amountCents)[0]
      : undefined;
  const selected = ranked[0] ?? fallback;

  return {
    detectedAmountCents: selected?.amountCents ?? null,
    detectedAmountText: selected?.rawText ?? null,
    candidates: candidates
      .sort((a, b) => b.score - a.score)
      .map((candidate) => ({
        label: candidate.label,
        amountCents: candidate.amountCents,
        rawText: candidate.rawText,
        score: candidate.score,
      })),
    confidence: selected ? Math.min(0.95, Math.max(0.45, selected.score / 130)) : undefined,
  };
}
