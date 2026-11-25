import * as cheerio from 'cheerio';
import type { ScoutListing, WatchTarget } from '../types/scout';
import { evaluateListingCondition, parseEuroPrice } from './listingEvaluator';

export function isBotChallengeHtml(html: string): boolean {
  // If real ad items exist in the HTML, it is not a challenge page
  if (html.includes('data-adid=') || html.includes('class="aditem')) {
    return false;
  }
  const lower = html.toLowerCase();
  return (
    lower.includes('captcha') ||
    lower.includes('cf-challenge') ||
    lower.includes('zugriff verweigert') ||
    lower.includes('access denied') ||
    lower.includes('bitte bestätigen sie, dass sie ein mensch sind')
  );
}

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseKleinanzeigenHtml(
  html: string,
  target: WatchTarget,
  source: ScoutListing['source'] = 'kleinanzeigen.de'
): ScoutListing[] {
  const $ = cheerio.load(html);
  const listings: ScoutListing[] = [];
  const seenIds = new Set<string>();
  const nowIso = new Date().toISOString();

  // Support both modern <article data-adid="..."> and legacy <article class="aditem">
  $('article[data-adid], article.aditem').each((_, el) => {
    const node = $(el);
    const adId = node.attr('data-adid')?.trim() || `${target.id}-${listings.length + 1}`;
    if (seenIds.has(adId)) {
      return;
    }

    let ldTitle = '';
    let ldDescription = '';
    const ldJsonRaw = node.find('script[type="application/ld+json"]').first().html();
    if (ldJsonRaw) {
      try {
        const parsed = JSON.parse(ldJsonRaw) as { title?: unknown; description?: unknown };
        if (typeof parsed.title === 'string') ldTitle = normalizeText(parsed.title);
        if (typeof parsed.description === 'string') ldDescription = normalizeText(parsed.description);
      } catch {
        // Ignore malformed JSON-LD
      }
    }

    const anchor = node.find('h3 a, h2 a, a.ellipsis').first();
    const domTitle = normalizeText(anchor.text());
    const title = domTitle || ldTitle;
    if (!title) {
      return;
    }

    const rawHref = node.attr('data-href') || anchor.attr('href') || '';
    const url = rawHref.startsWith('http')
      ? rawHref
      : rawHref.startsWith('/')
        ? `https://www.kleinanzeigen.de${rawHref}`
        : `https://www.kleinanzeigen.de/s-anzeige/${adId}`;

    // Validate external link scheme strictly
    if (!url.startsWith('https://www.kleinanzeigen.de/')) {
      return;
    }

    // Extract price from legacy selector or modern <p> containing €, VB, or Zu verschenken
    let priceRaw = normalizeText(
      node.find('.aditem-main--middle--price-shipping--price, .aditem-main--middle--price').first().text()
    );
    if (!priceRaw) {
      const priceEl = node
        .find('p')
        .filter((_, p) => {
          const t = normalizeText($(p).text());
          return t.length > 0 && t.length <= 32 && /€|\bvb\b|zu verschenken/i.test(t);
        })
        .first();
      priceRaw = normalizeText(priceEl.text());
    }

    // Extract description from modern selector, legacy selector, or JSON-LD
    const domDesc = normalizeText(
      node
        .find('.aditem-main--middle--description, p.text-bodyRegular')
        .first()
        .text()
    );
    const description =
      ldDescription.length >= domDesc.length ? ldDescription : domDesc;

    const location =
      normalizeText(node.find('svg[data-title="locationOutline"]').next('span').text()) ||
      normalizeText(node.find('.aditem-main--top--left').first().text()) ||
      'Germany';

    const postedAtLabel =
      normalizeText(node.find('svg[data-title="calendarOutline"]').next('span').text()) ||
      normalizeText(node.find('.aditem-main--top--right').first().text()) ||
      'Recently';

    const { priceEur, negotiable } = parseEuroPrice(priceRaw);
    const assessment = evaluateListingCondition({ title, description, priceEur }, target);

    seenIds.add(adId);
    listings.push({
      id: `${target.id}-${adId}`,
      targetId: target.id,
      targetName: target.name,
      title,
      description: description || title,
      priceRaw: priceRaw || 'VB',
      priceEur,
      negotiable,
      location,
      postedAtLabel,
      url,
      source,
      discoveredAt: nowIso,
      assessment,
    });
  });

  return listings;
}
