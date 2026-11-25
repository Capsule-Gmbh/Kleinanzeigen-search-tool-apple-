import { useState } from 'react';
import { Check, Plus, Save, Upload } from 'lucide-react';
import type { ScoutListing, WatchTarget } from '../types/scout';

interface AlertRulesViewProps {
  targets: WatchTarget[];
  focusedTargetId: string | null;
  intervalMinutes: number;
  onUpdateInterval: (minutes: number) => void;
  onSaveTarget: (updated: WatchTarget) => void;
  onAddTarget: (newTarget: WatchTarget) => void;
  onImportParsedHtml: (targetId: string, listings: ScoutListing[]) => void;
}

export function AlertRulesView({
  targets,
  focusedTargetId,
  intervalMinutes,
  onUpdateInterval,
  onSaveTarget,
  onAddTarget,
  onImportParsedHtml,
}: AlertRulesViewProps) {
  const [editingId, setEditingId] = useState<string>(focusedTargetId ?? targets[0]?.id ?? '');
  const activeTarget = targets.find((t) => t.id === editingId) ?? targets[0];

  const [maxPrice, setMaxPrice] = useState<string>(String(activeTarget?.maxPriceEur ?? 800));
  const [idealPrice, setIdealPrice] = useState<string>(String(activeTarget?.idealPriceEur ?? 700));
  const [searchQuery, setSearchQuery] = useState<string>(activeTarget?.searchQuery ?? '');
  const [positiveText, setPositiveText] = useState<string>(
    activeTarget?.positiveKeywords.join(', ') ?? ''
  );
  const [flawText, setFlawText] = useState<string>(
    activeTarget?.excludedFlawKeywords.join(', ') ?? ''
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [newMaxPrice, setNewMaxPrice] = useState('500');

  const [rawHtmlInput, setRawHtmlInput] = useState('');
  const [htmlStatus, setHtmlStatus] = useState<string | null>(null);
  const [isParsingHtml, setIsParsingHtml] = useState(false);

  const selectTargetForEdit = (t: WatchTarget) => {
    setEditingId(t.id);
    setMaxPrice(String(t.maxPriceEur));
    setIdealPrice(String(t.idealPriceEur));
    setSearchQuery(t.searchQuery);
    setPositiveText(t.positiveKeywords.join(', '));
    setFlawText(t.excludedFlawKeywords.join(', '));
    setSavedNotice(null);
    setFormError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTarget) return;

    const parsedMax = Number.parseInt(maxPrice, 10);
    const parsedIdeal = Number.parseInt(idealPrice, 10);
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      setFormError('Max price ceiling must be a positive EUR amount.');
      return;
    }
    if (!Number.isFinite(parsedIdeal) || parsedIdeal <= 0 || parsedIdeal > parsedMax) {
      setFormError('Ideal deal price must be positive and less than or equal to max ceiling.');
      return;
    }
    if (!searchQuery.trim()) {
      setFormError('Kleinanzeigen search query cannot be empty.');
      return;
    }

    setFormError(null);
    const updated: WatchTarget = {
      ...activeTarget,
      maxPriceEur: parsedMax,
      idealPriceEur: parsedIdeal,
      searchQuery: searchQuery.trim(),
      positiveKeywords: positiveText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      excludedFlawKeywords: flawText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    onSaveTarget(updated);
    setSavedNotice(`Saved rules for ${updated.name}`);
  };

  const handleCreateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number.parseInt(newMaxPrice, 10);
    if (!newName.trim() || !newQuery.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setFormError('Please provide a valid product name, query, and positive max price.');
      return;
    }
    const base = targets[0];
    const id = `custom-${Date.now()}`;
    const created: WatchTarget = {
      id,
      name: newName.trim(),
      shortLabel: newName.trim().slice(0, 22),
      searchQuery: newQuery.trim(),
      imagePath: '',
      maxPriceEur: parsedPrice,
      idealPriceEur: Math.round(parsedPrice * 0.9),
      requiredTermGroups: [[newName.trim().split(' ')[0].toLowerCase()]],
      forbiddenModelTerms: ['defekt', 'dummy', 'nur karton'],
      positiveKeywords: base?.positiveKeywords ?? ['neuwertig', 'wie neu', 'ovp'],
      excludedFlawKeywords: base?.excludedFlawKeywords ?? ['defekt', 'kratzer', 'riss'],
      notes: 'Custom added watchlist target.',
      enabled: true,
    };
    onAddTarget(created);
    setNewName('');
    setNewQuery('');
    setShowNewForm(false);
    selectTargetForEdit(created);
    setSavedNotice(`Added "${created.name}" to active watchlist.`);
  };

  const handleParseSavedHtml = async () => {
    if (!activeTarget || !rawHtmlInput.trim()) {
      setHtmlStatus('Paste HTML source from a Kleinanzeigen search results page first.');
      return;
    }
    setIsParsingHtml(true);
    setHtmlStatus(null);
    try {
      const resp = await fetch('/api/parse-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: activeTarget, html: rawHtmlInput }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setHtmlStatus(data.error || 'Could not parse HTML.');
      } else {
        onImportParsedHtml(activeTarget.id, data.listings);
        setHtmlStatus(
          `Parsed ${data.listings.length} listings (${data.giftReadyCount} gift-ready matches) and updated feed.`
        );
        setRawHtmlInput('');
      }
    } catch {
      setHtmlStatus('Request failed while parsing HTML.');
    } finally {
      setIsParsingHtml(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="font-display text-lg font-semibold text-slate-900">
            Scout Cadence & Condition Rules
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tune price ceilings, mint-condition phrases, and the automatic polling interval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="scout-interval-select" className="text-xs font-medium text-slate-700 whitespace-nowrap">
            Poll Interval
          </label>
          <select
            id="scout-interval-select"
            value={intervalMinutes}
            onChange={(e) => onUpdateInterval(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            <option value={15}>Every 15 minutes</option>
            <option value={30}>Every 30 minutes (Default)</option>
            <option value={60}>Every 60 minutes</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900">Watchlist Targets</h2>
            <button
              type="button"
              onClick={() => setShowNewForm(!showNewForm)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-2">
            {targets.map((t) => {
              const selected = activeTarget?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTargetForEdit(t)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    selected
                      ? 'border-slate-900 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-display text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                    Ceiling € {t.maxPriceEur} · Ideal € {t.idealPriceEur}
                  </p>
                </button>
              );
            })}
          </div>

          {showNewForm && (
            <form
              onSubmit={handleCreateTarget}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
            >
              <h3 className="font-display text-xs font-semibold text-slate-900">
                Add Custom Gift Target
              </h3>
              <div>
                <label htmlFor="new-target-name" className="block text-xs text-slate-600 mb-1">
                  Product Name
                </label>
                <input
                  id="new-target-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. AirPods Max USB-C"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="new-target-query" className="block text-xs text-slate-600 mb-1">
                  Kleinanzeigen Query
                </label>
                <input
                  id="new-target-query"
                  type="text"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="e.g. airpods max usb c ovp"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="new-target-price" className="block text-xs text-slate-600 mb-1">
                  Max Price (EUR)
                </label>
                <input
                  id="new-target-price"
                  type="number"
                  value={newMaxPrice}
                  onChange={(e) => setNewMaxPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Add to Watchlist
              </button>
            </form>
          )}
        </div>

        {activeTarget && (
          <div className="lg:col-span-8 space-y-6">
            <form
              onSubmit={handleSave}
              className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    {activeTarget.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">{activeTarget.notes}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rule-max-price" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Alert Price Ceiling (EUR)
                  </label>
                  <input
                    id="rule-max-price"
                    type="number"
                    min={1}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="rule-ideal-price" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Ideal Gift Deal Price (EUR)
                  </label>
                  <input
                    id="rule-ideal-price"
                    type="number"
                    min={1}
                    value={idealPrice}
                    onChange={(e) => setIdealPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rule-search-query" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Kleinanzeigen Search Query
                </label>
                <input
                  id="rule-search-query"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="rule-positive-keywords" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Required Mint-Condition Phrases (comma-separated)
                </label>
                <textarea
                  id="rule-positive-keywords"
                  rows={2}
                  value={positiveText}
                  onChange={(e) => setPositiveText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="rule-flaw-keywords" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Disqualifying Red-Flag Terms (comma-separated)
                </label>
                <textarea
                  id="rule-flaw-keywords"
                  rows={2}
                  value={flawText}
                  onChange={(e) => setFlawText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              {formError && (
                <p role="alert" className="text-xs font-medium text-rose-700">
                  {formError}
                </p>
              )}
              {savedNotice && (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  <span>{savedNotice}</span>
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Target Rules</span>
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Manual Kleinanzeigen HTML Evaluation
              </h3>
              <p className="text-xs text-slate-600">
                If cloud requests are challenged by Kleinanzeigen, copy the page source (`Ctrl+U`) from your browser search for{' '}
                <span className="font-medium text-slate-900">{activeTarget.name}</span> and paste it here to run the exact condition filter.
              </p>
              <label htmlFor="manual-html-input" className="sr-only">
                Kleinanzeigen HTML source
              </label>
              <textarea
                id="manual-html-input"
                rows={3}
                value={rawHtmlInput}
                onChange={(e) => setRawHtmlInput(e.target.value)}
                placeholder="Paste Kleinanzeigen search page HTML..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-600">{htmlStatus ?? ''}</span>
                <button
                  type="button"
                  onClick={handleParseSavedHtml}
                  disabled={isParsingHtml}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isParsingHtml ? 'Evaluating...' : 'Evaluate Pasted HTML'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
