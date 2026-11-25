import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  ScoutListing,
  ScoutRunSummary,
  ScoutTargetFetchStatus,
  WatchTarget,
} from './src/types/scout';
import { buildKleinanzeigenSearchUrl } from './src/utils/listingEvaluator';
import { isBotChallengeHtml, parseKleinanzeigenHtml } from './src/utils/kleinanzeigenParser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

function sanitizeTargetInput(raw: unknown): WatchTarget | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.id !== 'string' ||
    typeof obj.name !== 'string' ||
    typeof obj.searchQuery !== 'string' ||
    typeof obj.maxPriceEur !== 'number' ||
    typeof obj.idealPriceEur !== 'number'
  ) {
    return null;
  }

  return {
    id: obj.id.slice(0, 64),
    name: obj.name.slice(0, 120),
    shortLabel: typeof obj.shortLabel === 'string' ? obj.shortLabel.slice(0, 40) : obj.name.slice(0, 40),
    searchQuery: obj.searchQuery.slice(0, 140),
    imagePath: typeof obj.imagePath === 'string' ? obj.imagePath : '',
    maxPriceEur: Math.max(1, Math.min(50000, obj.maxPriceEur)),
    idealPriceEur: Math.max(1, Math.min(50000, obj.idealPriceEur)),
    requiredTermGroups: Array.isArray(obj.requiredTermGroups)
      ? obj.requiredTermGroups.slice(0, 8).map((g) =>
          Array.isArray(g) ? g.filter((x): x is string => typeof x === 'string').slice(0, 10) : []
        )
      : [],
    forbiddenModelTerms: Array.isArray(obj.forbiddenModelTerms)
      ? obj.forbiddenModelTerms.filter((x): x is string => typeof x === 'string').slice(0, 25)
      : [],
    positiveKeywords: Array.isArray(obj.positiveKeywords)
      ? obj.positiveKeywords.filter((x): x is string => typeof x === 'string').slice(0, 40)
      : [],
    excludedFlawKeywords: Array.isArray(obj.excludedFlawKeywords)
      ? obj.excludedFlawKeywords.filter((x): x is string => typeof x === 'string').slice(0, 40)
      : [],
    notes: typeof obj.notes === 'string' ? obj.notes.slice(0, 300) : '',
    enabled: obj.enabled !== false,
  };
}

async function fetchTargetLive(target: WatchTarget): Promise<{
  listings: ScoutListing[];
  status: ScoutTargetFetchStatus;
}> {
  const searchUrl = buildKleinanzeigenSearchUrl(target.searchQuery);
  const parsedUrl = new URL(searchUrl);

  // Strict host verification before outbound request
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'www.kleinanzeigen.de') {
    return {
      listings: [],
      status: {
        targetId: target.id,
        targetName: target.name,
        searchUrl,
        mode: 'blocked',
        httpStatus: null,
        listingCount: 0,
        giftReadyCount: 0,
        message: 'Invalid target host.',
      },
    };
  }

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return {
        listings: [],
        status: {
          targetId: target.id,
          targetName: target.name,
          searchUrl,
          mode: 'blocked',
          httpStatus: response.status,
          listingCount: 0,
          giftReadyCount: 0,
          message: `Kleinanzeigen returned HTTP ${response.status} to cloud IP (use Windows Desktop Launcher or HTML Import).`,
        },
      };
    }

    const html = await response.text();
    if (isBotChallengeHtml(html)) {
      return {
        listings: [],
        status: {
          targetId: target.id,
          targetName: target.name,
          searchUrl,
          mode: 'blocked',
          httpStatus: response.status,
          listingCount: 0,
          giftReadyCount: 0,
          message: 'Kleinanzeigen anti-bot challenge triggered on cloud IP.',
        },
      };
    }

    const listings = parseKleinanzeigenHtml(html, target, 'kleinanzeigen.de');
    const giftReadyCount = listings.filter((l) => l.assessment.status === 'gift_ready').length;

    return {
      listings,
      status: {
        targetId: target.id,
        targetName: target.name,
        searchUrl,
        mode: 'live',
        httpStatus: response.status,
        listingCount: listings.length,
        giftReadyCount,
        message:
          listings.length > 0
            ? `Fetched ${listings.length} live listings (${giftReadyCount} gift-ready).`
            : 'Connected to Kleinanzeigen, 0 listings matched the page selector.',
      },
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Network timeout';
    return {
      listings: [],
      status: {
        targetId: target.id,
        targetName: target.name,
        searchUrl,
        mode: 'blocked',
        httpStatus: null,
        listingCount: 0,
        giftReadyCount: 0,
        message: `Cloud fetch unavailable (${errMsg}). Run the Windows Desktop Launcher locally on your PC.`,
      },
    };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'kleinscout-gift-radar' });
  });

  app.post('/api/scout', async (req, res) => {
    const rawTargets: unknown[] = Array.isArray(req.body?.targets) ? req.body.targets : [];
    const targets = rawTargets
      .slice(0, 10)
      .map((item: unknown) => sanitizeTargetInput(item))
      .filter((t: WatchTarget | null): t is WatchTarget => t !== null && t.enabled);

    if (targets.length === 0) {
      res.status(400).json({ error: 'At least one enabled watch target is required.' });
      return;
    }

    const results = await Promise.all(targets.map((t: WatchTarget) => fetchTargetLive(t)));
    const listings = results.flatMap((r) => r.listings);
    const targetStatuses = results.map((r) => r.status);
    const anyLive = targetStatuses.some((s) => s.mode === 'live' && s.listingCount > 0);
    const giftReadyMatches = listings.filter((l) => l.assessment.status === 'gift_ready').length;

    const summary: ScoutRunSummary = {
      runId: `run-${Date.now()}`,
      executedAt: new Date().toISOString(),
      mode: anyLive ? 'live' : 'blocked',
      totalScanned: listings.length,
      giftReadyMatches,
      newAlertsCount: giftReadyMatches,
      targetStatuses,
    };

    res.json({ summary, listings });
  });

  app.post('/api/parse-html', (req, res) => {
    const html = typeof req.body?.html === 'string' ? req.body.html : '';
    const target = sanitizeTargetInput(req.body?.target);

    if (!html.trim() || !target) {
      res.status(400).json({ error: 'Provide both target configuration and saved Kleinanzeigen HTML.' });
      return;
    }

    const listings = parseKleinanzeigenHtml(html, target, 'html_import');
    res.json({
      listings,
      giftReadyCount: listings.filter((l) => l.assessment.status === 'gift_ready').length,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KleinScout Gift Radar server running on http://localhost:${PORT}`);
  });
}

startServer();
