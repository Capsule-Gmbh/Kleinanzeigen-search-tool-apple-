import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Info } from 'lucide-react';
import { AlertRulesView } from './components/AlertRulesView';
import { ListingGrid } from './components/ListingGrid';
import { ListingInspectorDrawer } from './components/ListingInspectorDrawer';
import { PriceHistoryView } from './components/PriceHistoryView';
import { Sidebar, type WorkspaceView } from './components/Sidebar';
import { TargetSummaryStrip } from './components/TargetSummaryStrip';
import { TopBar } from './components/TopBar';
import { WindowsLauncherView } from './components/WindowsLauncherView';
import {
  buildSampleSnapshotListings,
  INITIAL_PRICE_HISTORY,
  INITIAL_WATCH_TARGETS,
} from './data/defaultTargets';
import type {
  PriceAlert,
  PriceHistoryPoint,
  ScoutDataMode,
  ScoutListing,
  ScoutRunSummary,
  WatchTarget,
} from './types/scout';
import { evaluateListingCondition } from './utils/listingEvaluator';

const STORAGE_TARGETS_KEY = 'kleinscout_targets_v3';
const STORAGE_INTERVAL_KEY = 'kleinscout_interval_v1';

function loadStoredTargets(): WatchTarget[] {
  try {
    const raw = localStorage.getItem(STORAGE_TARGETS_KEY);
    if (!raw) return INITIAL_WATCH_TARGETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fallback to defaults
  }
  return INITIAL_WATCH_TARGETS;
}

function loadStoredInterval(): number {
  try {
    const raw = localStorage.getItem(STORAGE_INTERVAL_KEY);
    if (raw) {
      const n = Number(raw);
      if (n === 15 || n === 30 || n === 60) return n;
    }
  } catch {
    // Fallback to 30m
  }
  return 30;
}

function buildInitialAlerts(listings: ScoutListing[]): PriceAlert[] {
  return listings
    .filter((l) => l.assessment.status === 'gift_ready')
    .slice(0, 4)
    .map((l) => ({
      id: `alert-${l.id}`,
      listingId: l.id,
      targetId: l.targetId,
      targetName: l.targetName,
      title: l.title,
      priceEur: l.priceEur ?? 0,
      previousPriceEur: l.previousPriceEur ?? null,
      alertType: l.previousPriceEur
        ? 'price_drop'
        : l.assessment.isIdealDeal
          ? 'ideal_deal'
          : 'new_gift_match',
      createdAt: l.discoveredAt,
      url: l.url,
      read: false,
    }));
}

export default function App() {
  const [targets, setTargets] = useState<WatchTarget[]>(loadStoredTargets);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(loadStoredInterval);
  const [activeView, setActiveView] = useState<WorkspaceView>('monitor');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [listings, setListings] = useState<ScoutListing[]>(() =>
    buildSampleSnapshotListings(loadStoredTargets())
  );
  const [dataMode, setDataMode] = useState<ScoutDataMode>('sample_preview');
  const [lastRunSummary, setLastRunSummary] = useState<ScoutRunSummary | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [isScouting, setIsScouting] = useState(false);

  const [autoScoutEnabled, setAutoScoutEnabled] = useState(true);
  const [secondsUntilNextRun, setSecondsUntilNextRun] = useState<number>(loadStoredInterval() * 60);

  const [selectedTargetId, setSelectedTargetId] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'gift_ready'>('all');
  const [searchText, setSearchText] = useState('');
  const [inspectedListing, setInspectedListing] = useState<ScoutListing | null>(null);
  const [focusedRuleTargetId, setFocusedRuleTargetId] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<PriceAlert[]>(() =>
    buildInitialAlerts(buildSampleSnapshotListings(loadStoredTargets()))
  );
  const [history, setHistory] = useState<PriceHistoryPoint[]>(INITIAL_PRICE_HISTORY);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  const seenPricesRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    for (const item of listings) {
      if (item.priceEur !== null) {
        seenPricesRef.current.set(item.id, item.priceEur);
      }
    }
  }, [listings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TARGETS_KEY, JSON.stringify(targets));
    } catch {
      // Ignore storage quota issues
    }
  }, [targets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INTERVAL_KEY, String(intervalMinutes));
    } catch {
      // Ignore storage quota issues
    }
  }, [intervalMinutes]);

  const fireBrowserNotification = useCallback(
    (title: string, body: string) => {
      setToastMessage(`${title} — ${body}`);
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, { body });
        } catch {
          // Ignore notification constructor issues in headless environments
        }
      }
    },
    []
  );

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        fireBrowserNotification(
          'KleinScout Alerts Enabled',
          `You will be notified every ${intervalMinutes} minutes when a mint-condition gift drops below ceiling.`
        );
      }
    } catch {
      // Ignore
    }
  };

  const runScoutCycle = useCallback(async () => {
    setIsScouting(true);
    setSecondsUntilNextRun(intervalMinutes * 60);

    try {
      const resp = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets }),
      });

      if (!resp.ok) {
        throw new Error('Scout request returned an error.');
      }

      const data = (await resp.json()) as {
        summary: ScoutRunSummary;
        listings: ScoutListing[];
      };

      setLastRunSummary(data.summary);
      setLastCheckedAt(data.summary.executedAt);

      if (data.summary.mode === 'live') {
        setDataMode('live');
        if (data.listings.length > 0) {
          setListings(data.listings);
        }

        const newlyTriggered: PriceAlert[] = [];
        for (const item of data.listings) {
          if (item.assessment.status === 'gift_ready' && item.priceEur !== null) {
            const prev = seenPricesRef.current.get(item.id);
            if (prev === undefined || item.priceEur < prev) {
              newlyTriggered.push({
                id: `alert-${item.id}-${Date.now()}`,
                listingId: item.id,
                targetId: item.targetId,
                targetName: item.targetName,
                title: item.title,
                priceEur: item.priceEur,
                previousPriceEur: prev ?? null,
                alertType: prev !== undefined ? 'price_drop' : 'new_gift_match',
                createdAt: new Date().toISOString(),
                url: item.url,
                read: false,
              });
            }
          }
        }

        if (newlyTriggered.length > 0) {
          setAlerts((prev) => [...newlyTriggered, ...prev].slice(0, 50));
          const top = newlyTriggered[0];
          fireBrowserNotification(
            `${top.targetName}: € ${top.priceEur}`,
            top.title
          );
        } else {
          setToastMessage(
            `Live Kleinanzeigen scout complete: scanned ${data.listings.length} listings (${data.summary.giftReadyMatches} gift-ready matches).`
          );
        }

        const newHistoryPoints: PriceHistoryPoint[] = targets.map((t) => {
          const tItems = data.listings.filter((l) => l.targetId === t.id);
          const giftPrices = tItems
            .filter((l) => l.assessment.status === 'gift_ready' && l.priceEur !== null)
            .map((l) => l.priceEur as number)
            .sort((a, b) => a - b);

          return {
            id: `hist-${t.id}-${Date.now()}`,
            recordedAt: data.summary.executedAt,
            targetId: t.id,
            targetName: t.name,
            lowestGiftPriceEur: giftPrices[0] ?? null,
            medianPriceEur:
              giftPrices.length > 0 ? giftPrices[Math.floor(giftPrices.length / 2)] : null,
            giftReadyCount: giftPrices.length,
            source: 'live',
          };
        });
        setHistory((prev) => [...prev, ...newHistoryPoints]);
      } else {
        setDataMode('blocked');
        setToastMessage(
          'Kleinanzeigen challenged the cloud server IP — sample market snapshot remains active for evaluation.'
        );
      }
    } catch {
      setDataMode('blocked');
      setToastMessage('Could not reach Kleinanzeigen from cloud container.');
    } finally {
      setIsScouting(false);
    }
  }, [targets, intervalMinutes, fireBrowserNotification]);

  const initialScoutDoneRef = useRef(false);
  useEffect(() => {
    if (!initialScoutDoneRef.current) {
      initialScoutDoneRef.current = true;
      void runScoutCycle();
    }
  }, [runScoutCycle]);

  useEffect(() => {
    if (!autoScoutEnabled) return;
    const timer = window.setInterval(() => {
      setSecondsUntilNextRun((prev) => {
        if (prev <= 1) {
          void runScoutCycle();
          return intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [autoScoutEnabled, intervalMinutes, runScoutCycle]);

  const handleSaveTarget = (updated: WatchTarget) => {
    const nextTargets = targets.map((t) => (t.id === updated.id ? updated : t));
    setTargets(nextTargets);
    setListings((prev) =>
      prev.map((item) => {
        if (item.targetId !== updated.id) return item;
        return {
          ...item,
          targetName: updated.name,
          assessment: evaluateListingCondition(
            { title: item.title, description: item.description, priceEur: item.priceEur },
            updated
          ),
        };
      })
    );
  };

  const handleAddTarget = (newTarget: WatchTarget) => {
    setTargets((prev) => [...prev, newTarget]);
  };

  const handleUpdateInterval = (minutes: number) => {
    setIntervalMinutes(minutes);
    setSecondsUntilNextRun(minutes * 60);
  };

  const handleImportParsedHtml = (targetId: string, parsedListings: ScoutListing[]) => {
    setDataMode('manual_import');
    setListings((prev) => {
      const others = prev.filter((l) => l.targetId !== targetId);
      return [...parsedListings, ...others];
    });
    const giftMatches = parsedListings.filter((l) => l.assessment.status === 'gift_ready');
    if (giftMatches.length > 0) {
      const newAlerts: PriceAlert[] = giftMatches.map((l) => ({
        id: `alert-import-${l.id}-${Date.now()}`,
        listingId: l.id,
        targetId: l.targetId,
        targetName: l.targetName,
        title: l.title,
        priceEur: l.priceEur ?? 0,
        previousPriceEur: null,
        alertType: 'new_gift_match',
        createdAt: new Date().toISOString(),
        url: l.url,
        read: false,
      }));
      setAlerts((prev) => [...newAlerts, ...prev]);
    }
    setActiveView('monitor');
    setSelectedTargetId(targetId);
  };

  const handleLoadSampleSnapshot = () => {
    const sample = buildSampleSnapshotListings(targets);
    setListings(sample);
    setDataMode('sample_preview');
    setToastMessage('Sample market snapshot restored across all 3 gift targets.');
  };

  const filteredListings = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return listings.filter((item) => {
      if (selectedTargetId !== 'all' && item.targetId !== selectedTargetId) return false;
      if (conditionFilter === 'gift_ready' && item.assessment.status !== 'gift_ready') return false;
      if (q) {
        const hay = `${item.title} ${item.description} ${item.location} ${item.targetName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [listings, selectedTargetId, conditionFilter, searchText]);

  const unreadAlertsCount = useMemo(
    () => alerts.filter((a) => !a.read).length,
    [alerts]
  );

  const giftReadyTotal = useMemo(
    () => listings.filter((l) => l.assessment.status === 'gift_ready').length,
    [listings]
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        intervalMinutes={intervalMinutes}
        autoScoutEnabled={autoScoutEnabled}
        onToggleAutoScout={() => setAutoScoutEnabled((v) => !v)}
        secondsUntilNextRun={secondsUntilNextRun}
        unreadAlertsCount={unreadAlertsCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeView={activeView}
          isScouting={isScouting}
          onRunScoutNow={() => void runScoutCycle()}
          notificationPermission={notificationPermission}
          onRequestNotifications={() => void handleRequestNotifications()}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] w-full mx-auto space-y-6">
          {toastMessage && (
            <div
              role="status"
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>{toastMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeView === 'monitor' && (
            <>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 text-balance">
                    Gift Priority Watchlist
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Scouting Kleinanzeigen every {intervalMinutes} minutes for mint-condition, defect-free listings across your 3 gift priorities.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>
                    Source:{' '}
                    <strong className="font-semibold text-slate-900">
                      {dataMode === 'live'
                        ? 'Live Kleinanzeigen'
                        : dataMode === 'manual_import'
                          ? 'Imported HTML'
                          : dataMode === 'blocked'
                            ? 'Cloud Blocked (Preview Active)'
                            : 'Sample Market Snapshot'}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {giftReadyTotal} gift-ready / {listings.length} scanned
                  </span>
                  {lastCheckedAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Last check{' '}
                        {new Date(lastCheckedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {dataMode === 'blocked' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-950 space-y-1">
                      <p className="font-semibold">
                        Kleinanzeigen challenged automated requests from this cloud server IP
                      </p>
                      <p className="text-amber-900">
                        {lastRunSummary?.targetStatuses[0]?.message ??
                          'Run the Windows Desktop Scout from your home IP for uninterrupted 30-minute background alerts, or paste saved HTML in Condition & Price Rules.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveView('windows')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Get Windows Scout</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleSnapshot}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-50 whitespace-nowrap"
                    >
                      Restore Preview
                    </button>
                  </div>
                </div>
              )}

              {dataMode === 'sample_preview' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-600">
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>
                      Displaying realistic sample market listings to verify condition filters. Click{' '}
                      <strong className="text-slate-900">Run Scout Now</strong> to test live Kleinanzeigen fetching, or open{' '}
                      <strong className="text-slate-900">Windows Desktop App</strong> to run locally every {intervalMinutes} minutes.
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveView('windows')}
                    className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Windows Launcher</span>
                  </button>
                </div>
              )}

              <TargetSummaryStrip
                targets={targets}
                listings={listings}
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
                onEditTarget={(id) => {
                  setFocusedRuleTargetId(id);
                  setActiveView('rules');
                }}
              />

              <ListingGrid
                targets={targets}
                listings={filteredListings}
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
                conditionFilter={conditionFilter}
                onChangeConditionFilter={setConditionFilter}
                searchText={searchText}
                onChangeSearchText={setSearchText}
                isScouting={isScouting}
                onInspectListing={setInspectedListing}
                onResetFilters={() => {
                  setSelectedTargetId('all');
                  setConditionFilter('all');
                  setSearchText('');
                }}
              />
            </>
          )}

          {activeView === 'rules' && (
            <AlertRulesView
              targets={targets}
              focusedTargetId={focusedRuleTargetId}
              intervalMinutes={intervalMinutes}
              onUpdateInterval={handleUpdateInterval}
              onSaveTarget={handleSaveTarget}
              onAddTarget={handleAddTarget}
              onImportParsedHtml={handleImportParsedHtml}
            />
          )}

          {activeView === 'history' && (
            <PriceHistoryView
              targets={targets}
              alerts={alerts}
              history={history}
              onMarkAllRead={() =>
                setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
              }
            />
          )}

          {activeView === 'windows' && (
            <WindowsLauncherView
              targets={targets}
              intervalMinutes={intervalMinutes}
              onTriggerTestNotification={() =>
                fireBrowserNotification(
                  'Test Gift Alert: iPhone 15 Pro (€ 740)',
                  'Neuwertig, OVP, keine Kratzer — matching your mint condition rules.'
                )
              }
            />
          )}
        </main>
      </div>

      <ListingInspectorDrawer
        listing={inspectedListing}
        onClose={() => setInspectedListing(null)}
      />
    </div>
  );
}
