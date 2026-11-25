import {
  AlertTriangle,
  ArrowDownRight,
  CheckCircle2,
  ExternalLink,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { ListingStatus, ScoutListing, WatchTarget } from '../types/scout';

interface ListingGridProps {
  targets: WatchTarget[];
  listings: ScoutListing[];
  selectedTargetId: string;
  onSelectTarget: (targetId: string) => void;
  conditionFilter: 'all' | 'gift_ready';
  onChangeConditionFilter: (mode: 'all' | 'gift_ready') => void;
  searchText: string;
  onChangeSearchText: (val: string) => void;
  isScouting: boolean;
  onInspectListing: (listing: ScoutListing) => void;
  onResetFilters: () => void;
}

function renderStatusLabel(status: ListingStatus) {
  switch (status) {
    case 'gift_ready':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Gift-Ready Mint</span>
        </span>
      );
    case 'price_too_high':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Above Target</span>
        </span>
      );
    case 'excluded_flaw':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Excluded Flaw</span>
        </span>
      );
    case 'model_mismatch':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          <span>Spec Mismatch</span>
        </span>
      );
  }
}

export function ListingGrid({
  targets,
  listings,
  selectedTargetId,
  onSelectTarget,
  conditionFilter,
  onChangeConditionFilter,
  searchText,
  onChangeSearchText,
  isScouting,
  onInspectListing,
  onResetFilters,
}: ListingGridProps) {
  return (
    <section aria-label="Discovered listings feed" className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter by product target">
            <button
              type="button"
              role="tab"
              aria-selected={selectedTargetId === 'all'}
              onClick={() => onSelectTarget('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedTargetId === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Targets
            </button>
            {targets.map((target) => (
              <button
                key={target.id}
                type="button"
                role="tab"
                aria-selected={selectedTargetId === target.id}
                onClick={() => onSelectTarget(target.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedTargetId === target.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {target.shortLabel}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Condition filter">
            <button
              type="button"
              onClick={() => onChangeConditionFilter('gift_ready')}
              aria-pressed={conditionFilter === 'gift_ready'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                conditionFilter === 'gift_ready'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gift-Ready Mint Only
            </button>
            <button
              type="button"
              onClick={() => onChangeConditionFilter('all')}
              aria-pressed={conditionFilter === 'all'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                conditionFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Show All Scanned
            </button>
          </div>
        </div>

        <div className="relative w-full lg:w-64">
          <label htmlFor="listing-search-input" className="sr-only">
            Filter listings by keyword or city
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            id="listing-search-input"
            type="search"
            value={searchText}
            onChange={(e) => onChangeSearchText(e.target.value)}
            placeholder="Search title, city, OVP..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {isScouting ? (
        <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Loading listings">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center justify-between px-5 py-4 animate-pulse">
              <div className="space-y-2 w-2/3">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-display text-sm font-semibold text-slate-900">
            No listings match your current filters
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Try switching to "Show All Scanned" to inspect why items were excluded by the mint-condition filter or price ceiling.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pl-5 pr-3">Listing & Condition Signals</th>
                <th className="py-3 px-3">Condition Status</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-right">vs. Ceiling</th>
                <th className="py-3 pl-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {listings.map((listing) => {
                const delta = listing.assessment.priceDeltaEur;
                const isPriceDrop =
                  listing.previousPriceEur !== null &&
                  listing.previousPriceEur !== undefined &&
                  listing.priceEur !== null &&
                  listing.priceEur < listing.previousPriceEur;

                return (
                  <tr
                    key={listing.id}
                    className="group hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 pl-5 pr-3 max-w-md">
                      <button
                        type="button"
                        onClick={() => onInspectListing(listing)}
                        className="text-left font-medium text-slate-900 hover:text-emerald-800 transition-colors focus-visible:outline-2 focus-visible:outline-slate-900"
                      >
                        {listing.title}
                      </button>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span>{listing.targetName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{listing.location}</span>
                        <span aria-hidden="true">·</span>
                        <span>{listing.postedAtLabel}</span>
                        {listing.assessment.matchedPositive.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-700 font-medium">
                              {listing.assessment.matchedPositive.slice(0, 3).join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <div>{renderStatusLabel(listing.assessment.status)}</div>
                      {listing.assessment.mismatchReason && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {listing.assessment.mismatchReason}
                        </p>
                      )}
                      {listing.assessment.matchedRedFlags.length > 0 && (
                        <p className="mt-0.5 text-xs text-rose-600">
                          Flagged: {listing.assessment.matchedRedFlags.join(', ')}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right align-top whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        {listing.priceEur !== null
                          ? `€ ${listing.priceEur.toLocaleString('de-DE')}`
                          : listing.priceRaw}
                        {listing.negotiable && (
                          <span className="ml-1.5 text-xs font-normal text-slate-500">VB</span>
                        )}
                      </div>
                      {isPriceDrop && listing.previousPriceEur && (
                        <div className="mt-0.5 inline-flex items-center gap-0.5 font-mono text-xs text-emerald-700 tabular-nums">
                          <ArrowDownRight className="h-3 w-3" />
                          <span>was € {listing.previousPriceEur.toLocaleString('de-DE')}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right align-top whitespace-nowrap">
                      {delta !== null ? (
                        <span
                          className={`font-mono text-xs font-medium tabular-nums ${
                            delta <= 0 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {delta <= 0 ? `${delta} €` : `+${delta} €`}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 pl-3 pr-5 text-right align-top whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onInspectListing(listing)}
                          aria-label={`Inspect ${listing.title}`}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Inspect
                        </button>
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${listing.title} on Kleinanzeigen`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
