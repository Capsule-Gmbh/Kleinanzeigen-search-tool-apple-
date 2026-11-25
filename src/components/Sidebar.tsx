import { Bell, Clock, Download, History, Radar, SlidersHorizontal, X } from 'lucide-react';
import { formatCountdown } from '../utils/listingEvaluator';

export type WorkspaceView = 'monitor' | 'rules' | 'history' | 'windows';

interface SidebarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  intervalMinutes: number;
  autoScoutEnabled: boolean;
  onToggleAutoScout: () => void;
  secondsUntilNextRun: number;
  unreadAlertsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: WorkspaceView;
  label: string;
  icon: typeof Radar;
}> = [
  { id: 'monitor', label: 'Live Scout Feed', icon: Radar },
  { id: 'rules', label: 'Condition & Price Rules', icon: SlidersHorizontal },
  { id: 'history', label: 'Price Alerts & History', icon: History },
  { id: 'windows', label: 'Windows Desktop App', icon: Download },
];

export function Sidebar({
  activeView,
  onSelectView,
  intervalMinutes,
  autoScoutEnabled,
  onToggleAutoScout,
  secondsUntilNextRun,
  unreadAlertsCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 px-4 py-5">
      <div>
        <div className="flex items-center justify-between px-2 pb-6">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            KleinScout
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-slate-900 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'history' && unreadAlertsCount > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? 'text-emerald-300' : 'text-emerald-700 font-semibold'
                    }`}
                  >
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 pt-4 px-2 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{intervalMinutes}m Interval</span>
          </span>
          <span className="font-mono text-slate-900 font-medium tabular-nums">
            {autoScoutEnabled ? formatCountdown(secondsUntilNextRun) : 'Paused'}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleAutoScout}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-slate-900"
        >
          <span>Auto-Scout Timer</span>
          <span className={autoScoutEnabled ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
            {autoScoutEnabled ? 'Active' : 'Off'}
          </span>
        </button>

        <p className="text-xs leading-relaxed text-slate-500">
          <Bell className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-slate-400" />
          Scouts every {intervalMinutes} min while open for mint-condition gift drops.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[85vw] h-full z-10">{navContent}</aside>
        </div>
      )}
    </>
  );
}
