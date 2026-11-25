import type { ConditionAssessment, WatchTarget } from '../types/scout';

const NEGATED_FLAW_PATTERNS: Array<{ pattern: RegExp; positiveLabel: string }> = [
  { pattern: /\b(keine|ohne|frei von|null)\s+kratzer\b/gi, positiveLabel: 'keine Kratzer' },
  { pattern: /\bkratzerfrei\b/gi, positiveLabel: 'kratzerfrei' },
  { pattern: /\b(keine|ohne)\s+gebrauchsspuren\b/gi, positiveLabel: 'keine Gebrauchsspuren' },
  { pattern: /\b(keine|ohne)\s+(macken|dellen|schäden|beschädigungen)\b/gi, positiveLabel: 'ohne Macken/Dellen' },
  { pattern: /\bnicht\s+defekt\b/gi, positiveLabel: 'funktionsfähig' },
  { pattern: /\bohne\s+simlock\b/gi, positiveLabel: 'simlockfrei' },
  { pattern: /\bohne\s+icloud[-\s]?sperre\b/gi, positiveLabel: 'iCloud frei' },
  { pattern: /\b(mit|in|immer mit)\s+(panzerglas|hülle|case|schutzhülle)(\s+und\s+(panzerglas|hülle|case|schutzhülle))?\s*(genutzt|getragen|verwendet|geschützt)\b/gi, positiveLabel: 'geschützt genutzt' },
];

export function formatEur(amount: number): string {
  return `€ ${amount.toLocaleString('de-DE')}`;
}

export function parseEuroPrice(rawPrice: string): { priceEur: number | null; negotiable: boolean } {
  const normalized = rawPrice.trim();
  const negotiable = /\bvb\b|verhandlungsbasis/i.test(normalized);

  if (!normalized) {
    return { priceEur: null, negotiable };
  }

  if (/zu verschenken/i.test(normalized)) {
    return { priceEur: 0, negotiable: false };
  }

  // Match German/European numeric formats such as "1.490 €", "789,50 €", "820 EUR"
  const match = normalized.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!match) {
    return { priceEur: null, negotiable };
  }

  let numericText = match[1];
  if (numericText.includes('.') && numericText.includes(',')) {
    numericText = numericText.replace(/\./g, '').replace(',', '.');
  } else if (numericText.includes('.')) {
    // In German prices, a dot followed by 3 digits is a thousands separator (e.g. 1.490)
    if (/\.\d{3}$/.test(numericText)) {
      numericText = numericText.replace(/\./g, '');
    }
  } else if (numericText.includes(',')) {
    numericText = numericText.replace(',', '.');
  }

  const parsed = Number.parseFloat(numericText);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { priceEur: null, negotiable };
  }

  return { priceEur: Math.round(parsed), negotiable };
}

export function buildKleinanzeigenSearchUrl(query: string): string {
  const cleanSlug = query
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const safeSlug = cleanSlug || 'apple';
  return `https://www.kleinanzeigen.de/s-${safeSlug}/k0`;
}

export function evaluateListingCondition(
  listing: { title: string; description: string; priceEur: number | null },
  target: WatchTarget
): ConditionAssessment {
  const combinedRaw = `${listing.title} ${listing.description}`
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let sanitizedForFlaws = combinedRaw.toLowerCase();
  const matchedPositiveSet = new Set<string>();

  for (const rule of NEGATED_FLAW_PATTERNS) {
    if (rule.pattern.test(sanitizedForFlaws)) {
      matchedPositiveSet.add(rule.positiveLabel);
      sanitizedForFlaws = sanitizedForFlaws.replace(rule.pattern, ' ');
    }
    rule.pattern.lastIndex = 0;
  }

  const combinedLower = combinedRaw.toLowerCase();

  // 1. Check required model accuracy groups
  let mismatchReason: string | null = null;
  for (const termGroup of target.requiredTermGroups) {
    const groupMatched = termGroup.some((term) => combinedLower.includes(term.toLowerCase()));
    if (!groupMatched) {
      mismatchReason = `Missing required spec (${termGroup[0]})`;
      break;
    }
  }

  // 2. Check forbidden model variants (e.g. Aluminium when Stainless Steel is required)
  if (!mismatchReason) {
    for (const forbidden of target.forbiddenModelTerms) {
      const escaped = forbidden.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundaryRegex = new RegExp(`(^|[^a-z0-9äöüß])${escaped}([^a-z0-9äöüß]|$)`, 'i');
      if (boundaryRegex.test(sanitizedForFlaws)) {
        mismatchReason = `Variant mismatch ("${forbidden}")`;
        break;
      }
    }
  }

  // 3. Collect positive gift-condition signals
  for (const keyword of target.positiveKeywords) {
    if (combinedLower.includes(keyword.toLowerCase())) {
      matchedPositiveSet.add(keyword);
    }
  }

  // 4. Collect flaw / disqualifying signals
  const WORD_BOUNDARY_FLAWS = new Set(['kaufe', 'suche', 'ankauf', 'riss', 'defekt']);
  const matchedRedFlagsSet = new Set<string>();
  for (const flaw of target.excludedFlawKeywords) {
    const lowerFlaw = flaw.trim().toLowerCase();
    if (!lowerFlaw) continue;
    if (WORD_BOUNDARY_FLAWS.has(lowerFlaw)) {
      const escaped = lowerFlaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundaryRegex = new RegExp(`(^|[^a-z0-9äöüß])${escaped}([^a-z0-9äöüß]|$)`, 'i');
      if (boundaryRegex.test(sanitizedForFlaws)) {
        matchedRedFlagsSet.add(flaw);
      }
    } else if (sanitizedForFlaws.includes(lowerFlaw)) {
      matchedRedFlagsSet.add(flaw);
    }
  }

  const matchedPositive = Array.from(matchedPositiveSet);
  const matchedRedFlags = Array.from(matchedRedFlagsSet);
  const hasPositiveMintSignal = matchedPositive.length > 0;

  const isWithinBudget =
    listing.priceEur !== null && listing.priceEur > 0 && listing.priceEur <= target.maxPriceEur;
  const isIdealDeal =
    listing.priceEur !== null && listing.priceEur > 0 && listing.priceEur <= target.idealPriceEur;
  const priceDeltaEur =
    listing.priceEur !== null ? listing.priceEur - target.maxPriceEur : null;

  let status: ConditionAssessment['status'] = 'gift_ready';
  if (mismatchReason) {
    status = 'model_mismatch';
  } else if (matchedRedFlags.length > 0) {
    status = 'excluded_flaw';
  } else if (!isWithinBudget) {
    status = 'price_too_high';
  } else if (!hasPositiveMintSignal) {
    status = 'excluded_flaw';
    matchedRedFlags.push('no mint/OVP proof');
  }

  return {
    status,
    matchedPositive,
    matchedRedFlags,
    mismatchReason,
    priceDeltaEur,
    isWithinBudget,
    isIdealDeal,
    hasPositiveMintSignal,
  };
}

export function formatCountdown(secondsRemaining: number): string {
  const safe = Math.max(0, Math.floor(secondsRemaining));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
