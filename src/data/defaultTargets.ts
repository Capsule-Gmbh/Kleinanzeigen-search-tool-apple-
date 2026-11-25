import type { PriceHistoryPoint, ScoutListing, WatchTarget } from '../types/scout';
import { evaluateListingCondition } from '../utils/listingEvaluator';

export const DEFAULT_POSITIVE_KEYWORDS = [
  'neuwertig',
  'wie neu',
  'ovp',
  'rechnung',
  'garantie',
  'applecare',
  'makellos',
  'keine kratzer',
  'ohne kratzer',
  'kratzerfrei',
  'top zustand',
  'ungeöffnet',
  'versiegelt',
  'mint',
  '100%',
  '99%',
  '98%',
  '97%',
  '96%',
  '95%',
];

export const DEFAULT_EXCLUDED_FLAWS = [
  'defekt',
  'bastler',
  'riss',
  'displaybruch',
  'gesprungen',
  'wasserschaden',
  'icloud',
  'gesperrt',
  'simlock',
  'kratzer',
  'delle',
  'macke',
  'nur verpackung',
  'leerkarton',
  'dummy',
  'ersatzteil',
  'stark gebraucht',
  'schaden',
  'broken',
  'cracked',
  'suche',
  'ankauf',
  'kaufe',
];

export const INITIAL_WATCH_TARGETS: WatchTarget[] = [
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro (Natural / White Titanium)',
    shortLabel: 'iPhone 15 Pro Natur/Weiß',
    searchQuery: 'iphone 15 pro titan',
    imagePath: '/src/assets/images/gift_iphone_15_pro_1795578136785.jpg',
    maxPriceEur: 820,
    idealPriceEur: 740,
    requiredTermGroups: [
      ['iphone 15 pro', '15 pro'],
      [
        'titan natur',
        'natural titanium',
        'natur',
        'titan weiß',
        'titan weiss',
        'white titanium',
        'weiß',
        'weiss',
        'white',
      ],
    ],
    forbiddenModelTerms: [
      'nur hülle',
      'nur case',
      'handyhülle',
      'silikon hülle',
      'silikon case',
      'schutzfolie',
      'nur panzerglas',
      'dummy',
      'nur karton',
      'iphone 14',
      'pro max',
      '15 pro max',
      'iphone 15 pro max',
      'promax',
      'titan schwarz',
      'black titanium',
      'titanium black',
      'titan blau',
      'blue titanium',
      'titanium blue',
    ],
    positiveKeywords: DEFAULT_POSITIVE_KEYWORDS,
    excludedFlawKeywords: DEFAULT_EXCLUDED_FLAWS,
    notes:
      'Gift priority #1: iPhone 15 Pro (non-Max) in Natural Titanium or White Titanium only, ≥95% battery, OVP.',
    enabled: true,
  },
  {
    id: 'watch-s9-ss-lte',
    name: 'Apple Watch Series 9 45mm Stainless Steel Silver LTE',
    shortLabel: 'Watch S9 Silver SS LTE',
    searchQuery: 'apple watch series 9 45mm edelstahl silber lte',
    imagePath: '/src/assets/images/gift_watch_series_9_1795578136810.jpg',
    maxPriceEur: 520,
    idealPriceEur: 450,
    requiredTermGroups: [
      ['series 9', 's9'],
      ['45mm', '45 mm'],
      ['edelstahl', 'stainless steel', 'stainless'],
      ['lte', 'cellular', 'gps + cellular', 'gps+cellular'],
      ['silber', 'silver'],
    ],
    forbiddenModelTerms: [
      'aluminium',
      'aluminum',
      '41mm',
      '41 mm',
      'series 8',
      'series 7',
      'armband only',
      'graphit',
      'graphite',
      'gold',
      'mitternacht',
      'midnight',
      'polarstern',
      'starlight',
      'edelstahl schwarz',
      'space black',
    ],
    positiveKeywords: DEFAULT_POSITIVE_KEYWORDS,
    excludedFlawKeywords: DEFAULT_EXCLUDED_FLAWS,
    notes:
      'Gift priority #2: Highest-end raw Silver Stainless Steel 45mm LTE (no dark PVD coating), unblemished sapphire glass.',
    enabled: true,
  },
  {
    id: 'macbook-pro-14-m3-pro',
    name: 'MacBook Pro 14-inch (M3 Pro+)',
    shortLabel: 'MacBook Pro 14 M3 Pro+',
    searchQuery: 'macbook pro 14 m3 pro',
    imagePath: '/src/assets/images/gift_macbook_pro_14_silver_1795579645280.jpg',
    maxPriceEur: 1650,
    idealPriceEur: 1480,
    requiredTermGroups: [
      ['macbook pro'],
      ['14', '14"', '14 zoll', '14-inch'],
      ['m3 pro', 'm3 max', 'm4 pro', 'm4 max'],
    ],
    forbiddenModelTerms: [
      'm1',
      'm1 pro',
      'm1 max',
      'm2',
      'm2 pro',
      'm2 max',
      'intel',
      'air',
      '16 zoll',
      '16"',
      '16-inch',
      '16 inch',
      '15 zoll',
      '15"',
      '13 zoll',
      '13"',
    ],
    positiveKeywords: DEFAULT_POSITIVE_KEYWORDS,
    excludedFlawKeywords: DEFAULT_EXCLUDED_FLAWS,
    notes:
      'Gift priority #3: 14-inch only, M3 Pro chip or higher (M3 Pro / M3 Max / M4 Pro), any color, low battery cycles, OVP.',
    enabled: true,
  },
];

interface SampleRawItem {
  id: string;
  targetId: string;
  title: string;
  description: string;
  priceRaw: string;
  priceEur: number;
  previousPriceEur?: number;
  negotiable: boolean;
  location: string;
  postedAtLabel: string;
  url: string;
}

const SAMPLE_RAW_ITEMS: SampleRawItem[] = [
  {
    id: 'sample-ip-1',
    targetId: 'iphone-15-pro',
    title: 'iPhone 15 Pro 256GB Titan Natur – OVP, Rechnung & 98% Akku',
    description:
      'Verkaufe mein neuwertiges iPhone 15 Pro 256GB in Titan Natur. Immer mit Panzerglas und Case genutzt, absolut keine Kratzer, OVP und Apple Rechnung vorhanden. Batteriezustand 98%.',
    priceRaw: '765 € VB',
    priceEur: 765,
    previousPriceEur: 810,
    negotiable: true,
    location: '80331 München',
    postedAtLabel: 'Heute, 18:14',
    url: 'https://www.kleinanzeigen.de/s-iphone-15-pro-titan/k0',
  },
  {
    id: 'sample-ip-2',
    targetId: 'iphone-15-pro',
    title: 'Apple iPhone 15 Pro 128GB Titan Weiß – Wie neu, AppleCare+',
    description:
      'Top Zustand in Titan Weiß, wie neu mit OVP und Kabel. AppleCare+ aktiv bis 2026, Batteriezustand 100%, keine Gebrauchsspuren.',
    priceRaw: '730 €',
    priceEur: 730,
    negotiable: false,
    location: '10115 Berlin',
    postedAtLabel: 'Heute, 17:42',
    url: 'https://www.kleinanzeigen.de/s-iphone-15-pro-titan/k0',
  },
  {
    id: 'sample-ip-3',
    targetId: 'iphone-15-pro',
    title: 'iPhone 15 Pro Max 256GB Titan Natur – OVP wie neu',
    description:
      'Neuwertiges iPhone 15 Pro Max in Titan Natur mit OVP.',
    priceRaw: '790 €',
    priceEur: 790,
    negotiable: false,
    location: '20095 Hamburg',
    postedAtLabel: 'Heute, 16:05',
    url: 'https://www.kleinanzeigen.de/s-iphone-15-pro-titan/k0',
  },
  {
    id: 'sample-aw-1',
    targetId: 'watch-s9-ss-lte',
    title: 'Apple Watch Series 9 45mm Edelstahl Silber LTE + Milanaise OVP',
    description:
      'Neuwertige Apple Watch Series 9 45mm in Edelstahl Silber mit Cellular / LTE. Saphirglas ohne Kratzer, Batteriezustand 99%, OVP und Rechnung vom Fachhändler.',
    priceRaw: '445 €',
    priceEur: 445,
    previousPriceEur: 495,
    negotiable: false,
    location: '50667 Köln',
    postedAtLabel: 'Heute, 18:22',
    url: 'https://www.kleinanzeigen.de/s-apple-watch-series-9-45mm-edelstahl-silber-lte/k0',
  },
  {
    id: 'sample-aw-2',
    targetId: 'watch-s9-ss-lte',
    title: 'Apple Watch Series 9 45mm Edelstahl Silber Cellular – Versiegelt',
    description:
      'Ungeöffnet und versiegelt aus Vertragsverlängerung. Series 9 45mm Edelstahl Silber LTE Modell mit voller Garantie.',
    priceRaw: '509 € VB',
    priceEur: 509,
    negotiable: true,
    location: '60311 Frankfurt am Main',
    postedAtLabel: 'Heute, 15:50',
    url: 'https://www.kleinanzeigen.de/s-apple-watch-series-9-45mm-edelstahl-silber-lte/k0',
  },
  {
    id: 'sample-aw-3',
    targetId: 'watch-s9-ss-lte',
    title: 'Apple Watch Series 9 45mm Aluminium Silber LTE wie neu',
    description:
      'Sehr guter Zustand, Aluminium Gehäuse 45mm Cellular Silber mit OVP und Ladekabel.',
    priceRaw: '340 €',
    priceEur: 340,
    negotiable: false,
    location: '70173 Stuttgart',
    postedAtLabel: 'Heute, 14:11',
    url: 'https://www.kleinanzeigen.de/s-apple-watch-series-9-45mm-edelstahl-silber-lte/k0',
  },
  {
    id: 'sample-mb-1',
    targetId: 'macbook-pro-14-m3-pro',
    title: 'MacBook Pro 14" M3 Pro 18GB 512GB Space Schwarz – Wie neu, OVP',
    description:
      'MacBook Pro 14 Zoll mit M3 Pro Chip, 18GB RAM, 512GB SSD. Nur 14 Ladezyklen, Batteriezustand 100%, absolut makellos ohne Kratzer. OVP + Rechnung vorhanden.',
    priceRaw: '1.460 €',
    priceEur: 1460,
    previousPriceEur: 1580,
    negotiable: false,
    location: '80333 München',
    postedAtLabel: 'Heute, 18:05',
    url: 'https://www.kleinanzeigen.de/s-macbook-pro-14-m3-pro/k0',
  },
  {
    id: 'sample-mb-2',
    targetId: 'macbook-pro-14-m3-pro',
    title: 'MacBook Pro 14 Zoll M3 Pro 11-Core 18GB/1TB Silber – Neuwertig',
    description:
      'Wenig genutztes MacBook Pro 14 M3 Pro in Silber mit 1TB SSD. Top Zustand, keine Gebrauchsspuren, inklusive OVP und Netzteil.',
    priceRaw: '1.620 € VB',
    priceEur: 1620,
    negotiable: true,
    location: '40213 Düsseldorf',
    postedAtLabel: 'Heute, 16:40',
    url: 'https://www.kleinanzeigen.de/s-macbook-pro-14-m3-pro/k0',
  },
  {
    id: 'sample-mb-3',
    targetId: 'macbook-pro-14-m3-pro',
    title: 'MacBook Pro 16" M3 Pro 18GB 512GB Silber – Wie neu',
    description:
      'Neuwertig 16 Zoll mit Garantie und Rechnung.',
    priceRaw: '1.590 €',
    priceEur: 1590,
    negotiable: false,
    location: '20097 Hamburg',
    postedAtLabel: 'Heute, 13:20',
    url: 'https://www.kleinanzeigen.de/s-macbook-pro-14-m3-pro/k0',
  },
];

export function buildSampleSnapshotListings(targets: WatchTarget[]): ScoutListing[] {
  const nowIso = new Date().toISOString();
  const targetMap = new Map(targets.map((t) => [t.id, t]));

  return SAMPLE_RAW_ITEMS.flatMap((raw) => {
    const target = targetMap.get(raw.targetId);
    if (!target) return [];
    const assessment = evaluateListingCondition(
      { title: raw.title, description: raw.description, priceEur: raw.priceEur },
      target
    );
    return [
      {
        id: raw.id,
        targetId: target.id,
        targetName: target.name,
        title: raw.title,
        description: raw.description,
        priceRaw: raw.priceRaw,
        priceEur: raw.priceEur,
        previousPriceEur: raw.previousPriceEur ?? null,
        negotiable: raw.negotiable,
        location: raw.location,
        postedAtLabel: raw.postedAtLabel,
        url: raw.url,
        source: 'sample_snapshot',
        discoveredAt: nowIso,
        assessment,
      },
    ];
  });
}

export const INITIAL_PRICE_HISTORY: PriceHistoryPoint[] = [
  {
    id: 'hist-1',
    recordedAt: '2026-11-24T17:15:00.000Z',
    targetId: 'iphone-15-pro',
    targetName: 'iPhone 15 Pro',
    lowestGiftPriceEur: 795,
    medianPriceEur: 830,
    giftReadyCount: 2,
    source: 'sample_preview',
  },
  {
    id: 'hist-2',
    recordedAt: '2026-11-24T17:45:00.000Z',
    targetId: 'iphone-15-pro',
    targetName: 'iPhone 15 Pro',
    lowestGiftPriceEur: 765,
    medianPriceEur: 810,
    giftReadyCount: 2,
    source: 'sample_preview',
  },
  {
    id: 'hist-3',
    recordedAt: '2026-11-24T18:15:00.000Z',
    targetId: 'iphone-15-pro',
    targetName: 'iPhone 15 Pro',
    lowestGiftPriceEur: 730,
    medianPriceEur: 780,
    giftReadyCount: 2,
    source: 'sample_preview',
  },
  {
    id: 'hist-4',
    recordedAt: '2026-11-24T17:15:00.000Z',
    targetId: 'watch-s9-ss-lte',
    targetName: 'Apple Watch Series 9 45mm Stainless Steel LTE',
    lowestGiftPriceEur: 495,
    medianPriceEur: 520,
    giftReadyCount: 1,
    source: 'sample_preview',
  },
  {
    id: 'hist-5',
    recordedAt: '2026-11-24T18:15:00.000Z',
    targetId: 'watch-s9-ss-lte',
    targetName: 'Apple Watch Series 9 45mm Stainless Steel LTE',
    lowestGiftPriceEur: 445,
    medianPriceEur: 477,
    giftReadyCount: 2,
    source: 'sample_preview',
  },
  {
    id: 'hist-6',
    recordedAt: '2026-11-24T17:15:00.000Z',
    targetId: 'macbook-pro-14-m3-pro',
    targetName: 'MacBook Pro 14-inch M3 Pro chip',
    lowestGiftPriceEur: 1580,
    medianPriceEur: 1680,
    giftReadyCount: 2,
    source: 'sample_preview',
  },
  {
    id: 'hist-7',
    recordedAt: '2026-11-24T18:15:00.000Z',
    targetId: 'macbook-pro-14-m3-pro',
    targetName: 'MacBook Pro 14-inch M3 Pro chip',
    lowestGiftPriceEur: 1460,
    medianPriceEur: 1540,
    giftReadyCount: 2,
    source: 'sample_preview',
  },
];
