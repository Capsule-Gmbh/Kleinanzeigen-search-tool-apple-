import { ArrowUpRight, Laptop, Smartphone, Watch } from 'lucide-react';
import type { ScoutListing, WatchTarget } from '../types/scout';
import { buildKleinanzeigenSearchUrl } from '../utils/listingEvaluator';

interface TargetSummaryStripProps {
  targets: WatchTarget[];
  listings: ScoutListing[];
  selectedTargetId: string;
  onSelectTarget: (targetId: string) => void;
  onEditTarget: (targetId: string) => void;
}

function getFallbackIcon(targetId: string) {
  if (targetId.includes('watch')) return Watch;
  if (targetId.includes('macbook')) return Laptop;
  return Smartphone;
}

export function TargetSummaryStrip({
  targets,
  listings,
  selectedTargetId,
  onSelectTarget,
  onEditTarget,
}: TargetSummaryStripProps) {
  return (
    <section aria-label="Priority gift watchlist targets" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {targets.map((target, index) => {
        const targetListings = listings.filter((l) => l.targetId === target.id);
        const giftMatches = targetListings.filter((l) => l.assessment.status === 'gift_ready');
        const lowestGift = giftMatches.reduce<number | null>((min, l) => {
          if (l.priceEur === null) return min;
          return min === null ? l.priceEur : Math.min(min, l.priceEur);
        }, null);
        const isSelected = selectedTargetId === target.id;
        const FallbackIcon = getFallbackIcon(target.id);
        const searchUrl = buildKleinanzeigenSearchUrl(target.searchQuery);

        return (
          <div
            key={target.id}
            className={`flex flex-col justify-between rounded-xl border bg-white p-5 transition-colors ${
              isSelected ? 'border-slate-900' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                {target.imagePath ? (
                  <img
                    src={target.imagePath}
                    alt={target.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FallbackIcon className="h-7 w-7 text-slate-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Priority 0{index + 1}</span>
                  <a
                    href={searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open Kleinanzeigen search for ${target.name}`}
                    className="inline-flex items-center gap-0.5 text-slate-500 hover:text-slate-900 whitespace-nowrap"
                  >
                    <span>Search</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>

                <h2 className="mt-1 font-display text-base font-semibold text-slate-900 leading-snug">
                  {target.name}
                </h2>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs text-slate-500">Best Mint</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                  {lowestGift !== null ? `€ ${lowestGift.toLocaleString('de-DE')}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Max Ceiling</p>
                <p className="mt-0.5 font-mono text-base font-medium text-slate-700 tabular-nums">
                  € {target.maxPriceEur.toLocaleString('de-DE')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Gift Matches</p>
                <p
                  className={`mt-0.5 font-mono text-base font-semibold tabular-nums ${
                    giftMatches.length > 0 ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {giftMatches.length} / {targetListings.length}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSelectTarget(isSelected ? 'all' : target.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-slate-900 ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isSelected ? 'Showing Target' : 'Filter Listings'}
              </button>

              <button
                type="button"
                onClick={() => onEditTarget(target.id)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline whitespace-nowrap focus-visible:outline-2 focus-visible:outline-slate-900"
              >
                Edit Price Ceiling
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
