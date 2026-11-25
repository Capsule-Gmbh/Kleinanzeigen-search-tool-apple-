import { CheckCircle2, ExternalLink, ShieldCheck, X, XCircle } from 'lucide-react';
import type { ScoutListing } from '../types/scout';

interface ListingInspectorDrawerProps {
  listing: ScoutListing | null;
  onClose: () => void;
}

export function ListingInspectorDrawer({ listing, onClose }: ListingInspectorDrawerProps) {
  if (!listing) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspector-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white border-l border-slate-200 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {listing.targetName} · {listing.location}
            </p>
            <h2 id="inspector-title" className="mt-1 font-display text-lg font-semibold text-slate-900">
              {listing.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close listing inspector"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <p className="text-xs text-slate-500">Listed Price</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                {listing.priceEur !== null ? `€ ${listing.priceEur}` : listing.priceRaw}
              </p>
              {listing.previousPriceEur && (
                <p className="mt-0.5 font-mono text-xs text-emerald-700 tabular-nums">
                  Dropped from € {listing.previousPriceEur}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Assessment</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  listing.assessment.status === 'gift_ready'
                    ? 'text-emerald-700'
                    : listing.assessment.status === 'price_too_high'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                }`}
              >
                {listing.assessment.status === 'gift_ready'
                  ? 'Gift-Ready Mint Match'
                  : listing.assessment.status === 'price_too_high'
                    ? 'Over Budget Ceiling'
                    : listing.assessment.status === 'model_mismatch'
                      ? 'Model Spec Mismatch'
                      : 'Excluded Flaw Detected'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{listing.postedAtLabel}</p>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Seller Description
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Condition & Authenticity Checks
            </h3>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <ShieldCheck className="h-4 w-4 shrink-0 text-slate-600 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-900">Model & Variant Check: </span>
                  <span className="text-slate-600">
                    {listing.assessment.mismatchReason ?? 'All required model specifications matched'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-900">Positive Mint Signals: </span>
                  <span className="text-slate-600">
                    {listing.assessment.matchedPositive.length > 0
                      ? listing.assessment.matchedPositive.join(', ')
                      : 'None found in text'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs">
                <XCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <span className="font-medium text-slate-900">Disqualifying Flags: </span>
                  <span className="text-slate-600">
                    {listing.assessment.matchedRedFlags.length > 0
                      ? listing.assessment.matchedRedFlags.join(', ')
                      : 'Zero flaws detected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            <span>View on Kleinanzeigen</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
