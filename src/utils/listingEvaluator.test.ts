import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildKleinanzeigenSearchUrl,
  evaluateListingCondition,
  formatCountdown,
  parseEuroPrice,
} from './listingEvaluator';
import { isBotChallengeHtml, parseKleinanzeigenHtml } from './kleinanzeigenParser';
import { generateWindowsScoutFiles } from './windowsScriptGenerator';
import { INITIAL_WATCH_TARGETS } from '../data/defaultTargets';

test('parseEuroPrice handles German thousands separators, decimals, VB, and Zu verschenken', () => {
  assert.deepEqual(parseEuroPrice('799 €'), { priceEur: 799, negotiable: false });
  assert.deepEqual(parseEuroPrice('1.490 € VB'), { priceEur: 1490, negotiable: true });
  assert.deepEqual(parseEuroPrice('1.490,50 €'), { priceEur: 1491, negotiable: false });
  assert.deepEqual(parseEuroPrice('VB'), { priceEur: null, negotiable: true });
  assert.deepEqual(parseEuroPrice('Zu verschenken'), { priceEur: 0, negotiable: false });
});

test('buildKleinanzeigenSearchUrl sanitizes query to strict kleinanzeigen.de HTTPS search slug', () => {
  const url = buildKleinanzeigenSearchUrl('Apple Watch Series 9 45mm Edelstahl LTE');
  assert.equal(
    url,
    'https://www.kleinanzeigen.de/s-apple-watch-series-9-45mm-edelstahl-lte/k0'
  );
  const umlautUrl = buildKleinanzeigenSearchUrl('iPhone 15 Pro Hülle München');
  assert.equal(umlautUrl, 'https://www.kleinanzeigen.de/s-iphone-15-pro-huelle-muenchen/k0');
});

test('evaluateListingCondition accepts mint iPhone 15 Pro with negated "keine Kratzer" and protective case usage', () => {
  const iphoneTarget = INITIAL_WATCH_TARGETS[0];
  const result = evaluateListingCondition(
    {
      title: 'iPhone 15 Pro 256GB Titan Natur OVP',
      description:
        'Wie neu, immer mit Panzerglas und Case genutzt, Batteriezustand 98%, absolut keine Kratzer, Rechnung dabei.',
      priceEur: 760,
    },
    iphoneTarget
  );
  assert.equal(result.status, 'gift_ready');
  assert.equal(result.isWithinBudget, true);
  assert.equal(result.matchedRedFlags.length, 0);
  assert.ok(result.matchedPositive.includes('keine Kratzer'));

  const caseOnly = evaluateListingCondition(
    {
      title: 'Apple iPhone 15 Pro Silikon Case Hülle',
      description: 'Neuwertig in OVP.',
      priceEur: 25,
    },
    iphoneTarget
  );
  assert.equal(caseOnly.status, 'model_mismatch');
});

test('evaluateListingCondition rejects iPhone 15 Pro with actual scratch flaw or wrong color', () => {
  const iphoneTarget = INITIAL_WATCH_TARGETS[0];
  const scratchResult = evaluateListingCondition(
    {
      title: 'iPhone 15 Pro 256GB Titan Natur',
      description: 'Kleiner Kratzer am Rahmen, OVP dabei.',
      priceEur: 690,
    },
    iphoneTarget
  );
  assert.equal(scratchResult.status, 'excluded_flaw');
  assert.ok(scratchResult.matchedRedFlags.includes('kratzer'));

  const whiteAccepted = evaluateListingCondition(
    {
      title: 'iPhone 15 Pro 256GB Titan Weiß OVP',
      description: 'Wie neu, keine Kratzer.',
      priceEur: 740,
    },
    iphoneTarget
  );
  assert.equal(whiteAccepted.status, 'gift_ready');

  const blueRejected = evaluateListingCondition(
    {
      title: 'iPhone 15 Pro 256GB Titanium Blue OVP',
      description: 'Wie neu, keine Kratzer.',
      priceEur: 740,
    },
    iphoneTarget
  );
  assert.equal(blueRejected.status, 'model_mismatch');

  const proMaxRejected = evaluateListingCondition(
    {
      title: 'iPhone 15 Pro Max 256GB Titan Natur OVP',
      description: 'Wie neu, keine Kratzer.',
      priceEur: 780,
    },
    iphoneTarget
  );
  assert.equal(proMaxRejected.status, 'model_mismatch');
});

test('evaluateListingCondition enforces Silver Stainless Steel + LTE + 45mm for Apple Watch Series 9', () => {
  const watchTarget = INITIAL_WATCH_TARGETS[1];

  const valid = evaluateListingCondition(
    {
      title: 'Apple Watch Series 9 45mm Edelstahl Silber LTE',
      description: 'Neuwertig, OVP, keine Kratzer.',
      priceEur: 445,
    },
    watchTarget
  );
  assert.equal(valid.status, 'gift_ready');
  assert.equal(valid.isIdealDeal, true);

  const wrongMaterial = evaluateListingCondition(
    {
      title: 'Apple Watch Series 9 45mm Aluminium Silber LTE',
      description: 'Neuwertig mit OVP.',
      priceEur: 340,
    },
    watchTarget
  );
  assert.equal(wrongMaterial.status, 'model_mismatch');

  const wrongWatchColor = evaluateListingCondition(
    {
      title: 'Apple Watch Series 9 45mm Edelstahl Graphit LTE',
      description: 'Neuwertig mit OVP.',
      priceEur: 420,
    },
    watchTarget
  );
  assert.equal(wrongWatchColor.status, 'model_mismatch');
});

test('evaluateListingCondition enforces 14-inch M3 Pro+ (any color) and budget for MacBook Pro', () => {
  const mbTarget = INITIAL_WATCH_TARGETS[2];

  const overBudget = evaluateListingCondition(
    {
      title: 'MacBook Pro 14 Zoll M3 Pro Silber 18GB',
      description: 'Wie neu, OVP und Garantie.',
      priceEur: 1850,
    },
    mbTarget
  );
  assert.equal(overBudget.status, 'price_too_high');
  assert.equal(overBudget.priceDeltaEur, 200);

  const spaceBlackAccepted = evaluateListingCondition(
    {
      title: 'MacBook Pro 14 Zoll M3 Pro Space Schwarz 18GB',
      description: 'Wie neu, OVP und Garantie.',
      priceEur: 1450,
    },
    mbTarget
  );
  assert.equal(spaceBlackAccepted.status, 'gift_ready');

  const m3MaxAccepted = evaluateListingCondition(
    {
      title: 'MacBook Pro 14 Zoll M3 Max 36GB',
      description: 'Wie neu, OVP.',
      priceEur: 1620,
    },
    mbTarget
  );
  assert.equal(m3MaxAccepted.status, 'gift_ready');

  const sixteenRejected = evaluateListingCondition(
    {
      title: 'MacBook Pro 16 Zoll M3 Pro 18GB',
      description: 'Wie neu, OVP.',
      priceEur: 1550,
    },
    mbTarget
  );
  assert.equal(sixteenRejected.status, 'model_mismatch');

  const baseM3Rejected = evaluateListingCondition(
    {
      title: 'MacBook Pro 14 Zoll M3 16GB',
      description: 'Wie neu, OVP.',
      priceEur: 1250,
    },
    mbTarget
  );
  assert.equal(baseM3Rejected.status, 'model_mismatch');

  const wrongChip = evaluateListingCondition(
    {
      title: 'MacBook Pro 14 Zoll M2 Pro 16GB',
      description: 'Wie neu, OVP.',
      priceEur: 1350,
    },
    mbTarget
  );
  assert.equal(wrongChip.status, 'model_mismatch');
});

test('parseKleinanzeigenHtml extracts aditem listings and filters untrusted URLs', () => {
  const iphoneTarget = INITIAL_WATCH_TARGETS[0];
  const html = `
    <html><body>
      <article class="aditem" data-adid="299001122">
        <div class="aditem-main--top--left">80331 München</div>
        <div class="aditem-main--top--right">Heute, 18:10</div>
        <div class="aditem-main--middle">
          <h2><a class="ellipsis" href="/s-anzeige/iphone-15-pro-256gb-ovp/299001122-173-6443">iPhone 15 Pro 256GB Titan Natur OVP</a></h2>
          <p class="aditem-main--middle--description">Wie neu, keine Kratzer, Rechnung vorhanden.</p>
          <p class="aditem-main--middle--price-shipping--price">780 € VB</p>
        </div>
      </article>
    </body></html>
  `;
  const listings = parseKleinanzeigenHtml(html, iphoneTarget);
  assert.equal(listings.length, 1);
  assert.equal(listings[0].priceEur, 780);
  assert.equal(listings[0].negotiable, true);
  assert.equal(listings[0].assessment.status, 'gift_ready');
  assert.equal(
    listings[0].url,
    'https://www.kleinanzeigen.de/s-anzeige/iphone-15-pro-256gb-ovp/299001122-173-6443'
  );
});

test('parseKleinanzeigenHtml extracts modern data-adid article with JSON-LD and nbsp', () => {
  const watchTarget = INITIAL_WATCH_TARGETS[1];
  const html = `
    <html><body>
      <article class="flex justify-between" data-adid="3581756378" data-href="/s-anzeige/apple-watch-series-9-gps-cellular-45-mm-edelstahl/3581756378-405-6627">
        <div>
          <script type="application/ld+json">{"title":"Apple Watch Series 9","description":"Neuwertig, OVP, keine Kratzer."}</script>
        </div>
        <div>
          <svg data-title="locationOutline"></svg><span>84518 Garching</span>
          <svg data-title="calendarOutline"></svg><span>Gestern, 21:25</span>
          <h3><a href="/s-anzeige/apple-watch-series-9-gps-cellular-45-mm-edelstahl/3581756378-405-6627">Apple\u00a0Watch Series\u00a09 (GPS\u00a0+ Cellular) 45\u00a0mm – Edelstahl Silber</a></h3>
          <p class="mb-xsmall text-bodyRegular">Kurztext</p>
          <p class="my-xsmall text-title3 font-strong">349 €</p>
        </div>
      </article>
    </body></html>
  `;
  assert.equal(isBotChallengeHtml(html), false);
  const listings = parseKleinanzeigenHtml(html, watchTarget);
  assert.equal(listings.length, 1);
  assert.equal(listings[0].priceEur, 349);
  assert.equal(listings[0].location, '84518 Garching');
  assert.equal(listings[0].postedAtLabel, 'Gestern, 21:25');
  assert.equal(listings[0].assessment.status, 'gift_ready');
});

test('evaluateListingCondition rejects SUCHE / ANKAUF wanted ads but accepts "verkaufe"', () => {
  const mbTarget = INITIAL_WATCH_TARGETS[2];
  const res = evaluateListingCondition(
    {
      title: 'SUCHE / ANKAUF - Apple MacBook Pro 14 M3 Pro',
      description: 'Zahle fair, OVP erwünscht.',
      priceEur: 1200,
    },
    mbTarget
  );
  assert.equal(res.status, 'excluded_flaw');
  assert.ok(res.matchedRedFlags.includes('suche'));

  const selling = evaluateListingCondition(
    {
      title: 'MacBook Pro 14 M3 Pro 18GB',
      description: 'Ich verkaufe mein neuwertiges MacBook Pro mit OVP.',
      priceEur: 1450,
    },
    mbTarget
  );
  assert.equal(selling.status, 'gift_ready');
});

test('formatCountdown and generateWindowsScoutFiles produce valid outputs', () => {
  assert.equal(formatCountdown(1800), '30:00');
  assert.equal(formatCountdown(65), '01:05');

  const files = generateWindowsScoutFiles(INITIAL_WATCH_TARGETS, 30);
  assert.ok(files.ps1Content.includes('$IntervalMinutes = 30'));
  assert.ok(files.ps1Content.includes('iPhone 15 Pro'));
  assert.ok(files.ps1Content.includes('Apple Watch Series 9 45mm Stainless Steel Silver LTE'));
  assert.ok(files.ps1Content.includes('MacBook Pro 14-inch (M3 Pro+)'));
  assert.ok(files.batContent.includes('KleinScout-Windows.ps1'));
  assert.ok(files.pyContent.includes('INTERVAL_MINUTES = 30'));
  assert.ok(files.pyContent.includes('class KleinScoutApp'));
  assert.ok(files.pyContent.includes('def get_data_dir():'));
  assert.ok(files.pyContent.includes('LOCALAPPDATA'));
});
