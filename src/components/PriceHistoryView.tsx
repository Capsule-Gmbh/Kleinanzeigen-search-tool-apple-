import { ArrowDownRight, CheckCheck, ExternalLink } from 'lucide-react';
import type { PriceAlert, PriceHistoryPoint, WatchTarget } from '../types/scout';

interface PriceHistoryViewProps {
  targets: WatchTarget[];
  alerts: PriceAlert[];
  history: PriceHistoryPoint[];
  onMarkAllRead: () => void;
}

export function PriceHistoryView({
  targets,
  alerts,
  history,
  onMarkAllRead,
}: PriceHistoryViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="font-display text-lg font-semibold text-slate-900">
            Price Alerts & Market Trend Log
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tracks newly discovered gift-grade listings and price drops across your 30-minute scout cycles.
          </p>
        </div>

        <button
          type="button"
          onClick={onMarkAllRead}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          <span>Mark All Alerts Read</span>
        </button>
      </div>

      <section aria-label="Target price trends" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {targets.map((target) => {
          const points = history.filter((h) => h.targetId === target.id);
          const latest = points[points.length - 1];
          const earliest = points[0];
          const trendDelta =
            latest?.lowestGiftPriceEur != null && earliest?.lowestGiftPriceEur != null
              ? latest.lowestGiftPriceEur - earliest.lowestGiftPriceEur
              : null;

          const chartPrices = points
            .map((p) => p.lowestGiftPriceEur)
            .filter((v): v is number => v !== null);
          const minChart = chartPrices.length > 0 ? Math.min(...chartPrices) - 25 : 0;
          const maxChart = chartPrices.length > 0 ? Math.max(...chartPrices) + 25 : 100;
          const span = Math.max(1, maxChart - minChart);

          const svgPoints = chartPrices
            .map((val, idx) => {
              const x = chartPrices.length === 1 ? 120 : (idx / (chartPrices.length - 1)) * 240;
              const y = 56 - ((val - minChart) / span) * 44;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <div key={target.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-display text-sm font-semibold text-slate-900">{target.name}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                  {latest?.lowestGiftPriceEur != null ? `€ ${latest.lowestGiftPriceEur}` : '—'}
                </span>
                {trendDelta !== null && (
                  <span
                    className={`font-mono text-xs font-medium tabular-nums ${
                      trendDelta <= 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {trendDelta <= 0 ? `${trendDelta} € trend` : `+${trendDelta} € trend`}
                  </span>
                )}
              </div>

              <div className="mt-4 h-16 w-full">
                {chartPrices.length >= 2 ? (
                  <svg
                    viewBox="0 0 240 64"
                    className="h-full w-full overflow-visible"
                    role="img"
                    aria-label={`Price trend sparkline for ${target.name}`}
                  >
                    <polyline
                      fill="none"
                      stroke="#15803d"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={svgPoints}
                    />
                  </svg>
                ) : (
                  <p className="text-xs text-slate-400 pt-4">Collecting additional cycles...</p>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {points.length} recorded snapshots · Ceiling € {target.maxPriceEur}
              </p>
            </div>
          );
        })}
      </section>

      <section aria-label="Alert feed" className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Recent Gift Alerts ({alerts.length})
          </h2>
        </div>

        {alerts.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-slate-500">
            No price alerts triggered yet. Alerts appear here whenever a mint-condition item drops below your ceiling.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/70"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={alert.read ? 'text-slate-500' : 'text-emerald-700 font-semibold'}>
                      {alert.alertType === 'price_drop'
                        ? 'Price Drop'
                        : alert.alertType === 'ideal_deal'
                          ? 'Ideal Gift Deal'
                          : 'New Mint Match'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{alert.targetName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(alert.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900 truncate">{alert.title}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      € {alert.priceEur}
                    </p>
                    {alert.previousPriceEur && (
                      <p className="inline-flex items-center gap-0.5 font-mono text-xs text-emerald-700 tabular-nums">
                        <ArrowDownRight className="h-3 w-3" />
                        <span>was € {alert.previousPriceEur}</span>
                      </p>
                    )}
                  </div>

                  <a
                    href={alert.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
