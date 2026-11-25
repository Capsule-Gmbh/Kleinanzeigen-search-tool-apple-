import { Bell, BellRing, Menu, RefreshCw } from 'lucide-react';
import type { WorkspaceView } from './Sidebar';

interface TopBarProps {
  activeView: WorkspaceView;
  isScouting: boolean;
  onRunScoutNow: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotifications: () => void;
  onOpenMobileNav: () => void;
}

const VIEW_BREADCRUMBS: Record<WorkspaceView, string> = {
  monitor: 'Gift Watchlist / Live Scout Feed',
  rules: 'Gift Watchlist / Condition & Price Rules',
  history: 'Gift Watchlist / Price Alerts & History',
  windows: 'Gift Watchlist / Windows Desktop App',
};

export function TopBar({
  activeView,
  isScouting,
  onRunScoutNow,
  notificationPermission,
  onRequestNotifications,
  onOpenMobileNav,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-900"
        >
          <Menu className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-slate-600 truncate">
          {VIEW_BREADCRUMBS[activeView]}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
          <button
            type="button"
            onClick={onRequestNotifications}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-slate-900"
          >
            <Bell className="h-3.5 w-3.5 text-slate-500" />
            <span>Enable Desktop Alerts</span>
          </button>
        )}

        {notificationPermission === 'granted' && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0 px-2">
            <BellRing className="h-3.5 w-3.5" />
            <span>Desktop Alerts On</span>
          </span>
        )}

        <button
          type="button"
          onClick={onRunScoutNow}
          disabled={isScouting}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScouting ? 'animate-spin' : ''}`} />
          <span>{isScouting ? 'Scouting...' : 'Run Scout Now'}</span>
        </button>
      </div>
    </header>
  );
}
