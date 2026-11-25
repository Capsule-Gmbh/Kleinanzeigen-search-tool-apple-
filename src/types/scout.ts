export type ListingStatus =
  | 'gift_ready'
  | 'price_too_high'
  | 'excluded_flaw'
  | 'model_mismatch';

export type ScoutDataMode = 'live' | 'sample_preview' | 'manual_import' | 'blocked';

export interface WatchTarget {
  id: string;
  name: string;
  shortLabel: string;
  searchQuery: string;
  imagePath: string;
  maxPriceEur: number;
  idealPriceEur: number;
  requiredTermGroups: string[][];
  forbiddenModelTerms: string[];
  positiveKeywords: string[];
  excludedFlawKeywords: string[];
  notes: string;
  enabled: boolean;
}

export interface ConditionAssessment {
  status: ListingStatus;
  matchedPositive: string[];
  matchedRedFlags: string[];
  mismatchReason: string | null;
  priceDeltaEur: number | null;
  isWithinBudget: boolean;
  isIdealDeal: boolean;
  hasPositiveMintSignal: boolean;
}

export interface ScoutListing {
  id: string;
  targetId: string;
  targetName: string;
  title: string;
  description: string;
  priceRaw: string;
  priceEur: number | null;
  negotiable: boolean;
  location: string;
  postedAtLabel: string;
  url: string;
  source: 'kleinanzeigen.de' | 'sample_snapshot' | 'html_import';
  discoveredAt: string;
  previousPriceEur?: number | null;
  assessment: ConditionAssessment;
}

export interface PriceAlert {
  id: string;
  listingId: string;
  targetId: string;
  targetName: string;
  title: string;
  priceEur: number;
  previousPriceEur: number | null;
  alertType: 'new_gift_match' | 'price_drop' | 'ideal_deal';
  createdAt: string;
  url: string;
  read: boolean;
}

export interface ScoutTargetFetchStatus {
  targetId: string;
  targetName: string;
  searchUrl: string;
  mode: ScoutDataMode;
  httpStatus: number | null;
  listingCount: number;
  giftReadyCount: number;
  message: string;
}

export interface ScoutRunSummary {
  runId: string;
  executedAt: string;
  mode: ScoutDataMode;
  totalScanned: number;
  giftReadyMatches: number;
  newAlertsCount: number;
  targetStatuses: ScoutTargetFetchStatus[];
}

export interface PriceHistoryPoint {
  id: string;
  recordedAt: string;
  targetId: string;
  targetName: string;
  lowestGiftPriceEur: number | null;
  medianPriceEur: number | null;
  giftReadyCount: number;
  source: ScoutDataMode;
}
