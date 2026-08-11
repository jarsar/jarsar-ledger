// The demo book. Every number the dashboard shows is produced here as *rows*,
// so the app computes its way to ₱57,820.73 rather than being told it.
// The clock is pinned to 10 Aug 2026 14:30 Manila — day 10 of 31 — which is
// what makes the design's pace figures reproducible.
//
// August reconciles exactly to the design (category by category, 47 entries).
// July is built from the design's category list; its hero total is therefore
// computed rather than the ₱63,118.40 the design frame prints — those two
// figures contradict each other in the source, and rows win over a headline.

export const DEMO_NOW = new Date('2026-08-10T06:30:00Z'); // 14:30 Manila

// The back office issues 8 hex characters (the first block of a UUID), and
// the app shows the first four as a serial. The demo mints ids of the same
// shape so the serials read the same — deterministically, so a reload does
// not renumber the book.
let seq = 0;
const nextId = (vendor) => {
  let h = 0x811c9dc5;
  const seed = `${vendor}:${++seq}`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

const row = (date, time, category, vendor, item, amount, paid_via, source = 'shortcut', extra = {}) => ({
  id: nextId(vendor),
  date,
  time,
  month: date.slice(0, 7),
  category,
  vendor,
  item,
  amount,
  paid_via,
  notes: '',
  review: '',
  source,
  ...extra,
});

export const DEMO_BUDGETS = [
  { category: 'Rent', monthly: 36250, group: 'Essential' },
  { category: 'Gas', monthly: 6000, group: 'Essential' },
  { category: 'Utilities', monthly: 4000, group: 'Essential' },
  { category: 'Internet', monthly: 1699, group: 'Essential' },
  { category: 'Transport', monthly: 3000, group: 'Essential' },
  { category: 'Pets', monthly: 2500, group: 'Essential' },
  { category: 'Mobile', monthly: 599, group: 'Essential' },
  { category: 'Food', monthly: 12000, group: 'Lifestyle' },
  { category: 'Sports', monthly: 4000, group: 'Lifestyle' },
  { category: 'Coffee', monthly: 3000, group: 'Lifestyle' },
  { category: 'Buffer', monthly: 1500, group: 'Lifestyle' },
  { category: 'Parking', monthly: null, group: 'Lifestyle' },
  { category: 'Travel', monthly: null, group: 'Fund' },
  { category: 'Gadgets', monthly: null, group: 'Fund' },
  { category: 'Gifts', monthly: null, group: 'Fund' },
  { category: 'Others', monthly: 2000, group: 'Other' },
];

/** Spreads a category's month across plausible days, landing the total exactly. */
function spread(monthStr, category, vendor, item, total, days, paid_via, source = 'shortcut') {
  const each = Math.floor((total / days.length) * 100) / 100;
  let running = 0;
  return days.map((d, i) => {
    const amount = i === days.length - 1 ? Math.round((total - running) * 100) / 100 : each;
    running += amount;
    return row(
      `${monthStr}-${String(d).padStart(2, '0')}`,
      ['08:20', '12:41', '13:05', '19:12', '20:38'][i % 5],
      category,
      vendor,
      item,
      amount,
      paid_via,
      source
    );
  });
}

// ── AUGUST 2026 · the open month, day 10 of 31 ────────────────
// Rent 36,250 · Gas 3,458.73 · Utilities 1,842 · Internet 1,699 ·
// Transport 1,524 · Pets 640 · Mobile 599        →  Essential 46,012.73
// Food 4,918 · Sports 2,734 · Coffee 1,246 · Buffer 312 · Parking 260
//                                                →  Lifestyle  9,470.00
// Others 148 · Gadgets (fund) 2,190              →  ₱57,820.73, 47 entries

const AUG = '2026-08';

const augRows = [
  // The fixed bills, settled early and in one stroke each.
  row(`${AUG}-01`, '09:00', 'Rent', 'JarSar Property', 'August rent', 36250, 'Visa 9956', 'app'),
  row(`${AUG}-03`, '10:12', 'Mobile', 'Globe', 'Postpaid plan', 599, 'Visa 9956', 'gmail'),
  row(`${AUG}-05`, '11:30', 'Internet', 'Converge', 'Fibre — August', 1699, 'Visa 9956', 'gmail'),

  // One full tank on the 8th — the entry Radar notices.
  row(`${AUG}-08`, '17:45', 'Gas', 'Shell', '95 full tank', 3458.73, 'Visa 9956', 'shortcut'),

  row(`${AUG}-04`, '09:40', 'Utilities', 'Meralco', 'Electricity', 1342, 'Visa 9956', 'gmail'),
  row(`${AUG}-06`, '09:55', 'Utilities', 'Maynilad', 'Water', 500, 'GCash', 'shortcut'),

  // Grab, appearing more often than it used to.
  row(`${AUG}-02`, '08:15', 'Transport', 'Grab', 'Ortigas → BGC', 268, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-03`, '18:40', 'Transport', 'Grab', 'BGC → Ortigas', 254, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-05`, '08:22', 'Transport', 'Grab', 'Ortigas → Makati', 196, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-06`, '19:05', 'Transport', 'Grab', 'Makati → Ortigas', 212, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-07`, '08:10', 'Transport', 'Grab', 'Ortigas → Pasig', 158, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-08`, '20:30', 'Transport', 'Grab', 'Pasig → Ortigas', 152, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-09`, '09:02', 'Transport', 'Grab', 'Ortigas → BGC', 284, 'Grab - Visa 9956', 'gmail'),

  row(`${AUG}-04`, '16:20', 'Pets', 'Pet Express', 'Kibble, 3kg', 640, 'GCash', 'shortcut'),

  // Food — front-loaded, then a quiet week. That shape is what makes the
  // chip read CLEARS THE MONTH rather than a pace warning.
  row(`${AUG}-01`, '13:20', 'Food', 'Jollibee', '2-pc Chickenjoy w/ rice', 189, 'GCash', 'shortcut'),
  row(`${AUG}-02`, '12:48', 'Food', 'Yabu', 'Rosu katsu set', 595, 'Visa 9956', 'shortcut'),
  row(`${AUG}-03`, '17:52', 'Food', 'SNR MERCH PASIG', 'Unmatched counterparty', 1846.25, 'Visa 9956', 'gmail', {
    review: 'check',
    notes:
      'Vendor string matched no known counterparty. Nearest prior: S&R Membership Shopping, 11 entries this year.',
  }),
  row(`${AUG}-04`, '12:50', 'Food', 'McDo', 'Burger McDo meal', 178, 'GCash', 'shortcut'),
  row(`${AUG}-05`, '19:30', 'Food', 'Army Navy', 'Bacon burrito', 316.5, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-06`, '12:15', 'Food', 'Fish & Co.', 'Fish & chips', 352.5, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-07`, '20:10', 'Food', 'Soban K-Town Grill', 'Dinner — split of 4', 812.5, 'Splitwise', 'gmail', {
    review: 'check',
    notes:
      'Receipt gross is ₱3,250.00 for a party of four; the Splitwise share computes to ₱812.50. Certify the share, not the gross.',
  }),
  row(`${AUG}-07`, '21:05', 'Food', 'Jamba', 'Smoothies', 229.25, 'Grab - Visa 9956', 'gmail'),
  row(`${AUG}-08`, '12:40', 'Food', 'KFC', 'Zinger meal', 210, 'GCash', 'shortcut'),
  row(`${AUG}-09`, '13:20', 'Food', 'Jollibee', '2-pc Chickenjoy w/ rice', 189, 'GCash', 'shortcut'),

  // Sports — two sessions, and the next one breaches.
  row(`${AUG}-02`, '19:05', 'Sports', 'GolfZon', 'Indoor golf (3 hrs)', 1367, 'Visa 9956', 'shortcut'),
  row(`${AUG}-09`, '19:05', 'Sports', 'GolfZon', 'Indoor golf (3 hrs)', 1367, 'Visa 9956', 'shortcut'),

  // Coffee — the steady drip that compounds.
  row(`${AUG}-01`, '08:40', 'Coffee', 'Pickup Coffee', 'Iced Caramel Latte', 105, 'GCash', 'shortcut'),
  row(`${AUG}-02`, '08:35', 'Coffee', 'Weekday Coffee', 'Cold brew', 160, 'GCash', 'shortcut'),
  row(`${AUG}-03`, '08:52', 'Coffee', "Dunkin' Donuts", 'Iced coffee', 80, 'GCash', 'shortcut'),
  row(`${AUG}-04`, '08:30', 'Coffee', 'Pickup Coffee', 'Iced Caramel Latte', 105, 'GCash', 'shortcut'),
  row(`${AUG}-05`, '09:05', 'Coffee', 'Starbucks', 'Flatbread & latte', 135, 'GCash', 'shortcut'),
  row(`${AUG}-06`, '08:45', 'Coffee', 'Pickup Coffee', 'Iced Caramel Latte', 105, 'GCash', 'shortcut'),
  row(`${AUG}-07`, '08:38', 'Coffee', 'Weekday Coffee', 'Cold brew', 160, 'GCash', 'shortcut'),
  row(`${AUG}-08`, '08:50', 'Coffee', 'Pickup Coffee', 'Iced Caramel Latte', 105, 'GCash', 'shortcut'),
  row(`${AUG}-09`, '08:20', 'Coffee', "Dunkin' Donuts", 'Iced coffee', 80, 'GCash', 'shortcut'),
  row(`${AUG}-10`, '08:44', 'Coffee', 'Pickup Coffee', 'Iced Caramel Latte', 105, 'GCash', 'shortcut'),
  row(`${AUG}-10`, '14:12', 'Coffee', 'Pickup Coffee', 'Iced Caramel Latte', 106, 'GCash', 'shortcut'),

  // Buffer — small treats, and the creased 7-Eleven chit.
  row(`${AUG}-03`, '15:40', 'Buffer', "Dunkin'", 'Donuts', 87, 'GCash', 'shortcut'),
  row(`${AUG}-06`, '16:10', 'Buffer', "Dunkin' Donuts", 'Classic Munchkins', 50, 'GCash', 'shortcut'),
  row(`${AUG}-07`, '17:25', 'Buffer', 'Uncle John', 'Gatsby wax sachet', 7, 'Cash', 'app'),
  row(`${AUG}-09`, '21:37', 'Buffer', 'Seven Eleven', 'For review · total unclear', 168, 'Cash', 'app', {
    review: 'check',
    notes:
      'The receipt is creased through the total. ₱168.00 read at 0.61 confidence; ₱163.00 is also plausible.',
  }),

  // Parking — tracked, never capped.
  row(`${AUG}-02`, '10:05', 'Parking', 'Tiendesitas', 'Parking', 50, 'Cash', 'app'),
  row(`${AUG}-05`, '14:30', 'Parking', 'Estancia', 'Parking', 60, 'Cash', 'app'),
  row(`${AUG}-08`, '18:20', 'Parking', 'Shangri-La Plaza', 'Parking', 90, 'Cash', 'app'),
  row(`${AUG}-09`, '11:45', 'Parking', 'Megamall', 'Parking', 60, 'Cash', 'app'),

  row(`${AUG}-07`, '10:30', 'Others', 'BPI', 'Card annual fee', 148, 'Visa 9956', 'gmail'),

  // A fund draw — tracked alongside, never capped.
  row(`${AUG}-04`, '21:10', 'Gadgets', 'Shopee', 'USB-C hub', 2190, 'Visa 9956', 'gmail'),
];

// ── JULY 2026 · closed and certified ──────────────────────────
const JUL = '2026-07';

const julRows = [
  row(`${JUL}-01`, '09:00', 'Rent', 'JarSar Property', 'July rent', 36250, 'Visa 9956', 'app'),
  row(`${JUL}-03`, '10:12', 'Mobile', 'Globe', 'Postpaid plan', 599, 'Visa 9956', 'gmail'),
  row(`${JUL}-05`, '11:30', 'Internet', 'Converge', 'Fibre — July', 1699, 'Visa 9956', 'gmail'),
  ...spread(JUL, 'Gas', 'Shell', '95 full tank', 5742, [6, 19], 'Visa 9956'),
  // Three utility bills, so the month closes at cap rather than reading settled.
  ...spread(JUL, 'Utilities', 'Meralco', 'Electricity', 2488, [4, 18], 'Visa 9956', 'gmail'),
  row(`${JUL}-20`, '09:30', 'Utilities', 'Maynilad', 'Water', 1500, 'GCash', 'shortcut'),
  ...spread(JUL, 'Transport', 'Grab', 'City fares', 2463, [2, 8, 14, 21, 27], 'Grab - Visa 9956', 'gmail'),
  ...spread(JUL, 'Pets', 'Pet Express', 'Kibble and vet', 2180, [7, 22], 'GCash'),
  ...spread(JUL, 'Food', 'Assorted', 'Meals', 11204, [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 30], 'GCash'),
  ...spread(JUL, 'Sports', 'GolfZon', 'Indoor golf (3 hrs)', 3890, [5, 12, 26], 'Visa 9956'),
  ...spread(JUL, 'Coffee', 'Pickup Coffee', 'Iced Caramel Latte', 3214, [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30], 'GCash'),
  ...spread(JUL, 'Buffer', "Dunkin' Donuts", 'Small treats', 1388, [2, 9, 17, 24], 'GCash'),
  ...spread(JUL, 'Parking', 'Tiendesitas', 'Parking', 415, [3, 11, 20, 28], 'Cash', 'app'),
  ...spread(JUL, 'Others', 'Assorted', 'Sundries', 1164, [8, 23], 'Visa 9956'),
];

// ── MAR–JUN · only the totals matter; they feed the trend card ─
const priorMonths = [
  ['2026-03', 61200],
  ['2026-04', 58100],
  ['2026-05', 66900],
  ['2026-06', 59300],
];

const priorRows = priorMonths.flatMap(([m, total]) => {
  const food = Math.round(total * 0.19);
  const gas = Math.round(total * 0.09);
  return [
    row(`${m}-01`, '09:00', 'Rent', 'JarSar Property', 'Monthly rent', 36250, 'Visa 9956', 'app'),
    ...spread(m, 'Food', 'Assorted', 'Meals', food, [5, 12, 19, 26], 'GCash'),
    ...spread(m, 'Gas', 'Shell', '95 full tank', gas, [8, 22], 'Visa 9956'),
    ...spread(m, 'Others', 'Assorted', 'Sundries', total - 36250 - food - gas, [15], 'Visa 9956'),
  ];
});

// May carries the prior high the August Gas notice measures itself against.
for (const r of priorRows) {
  if (r.month === '2026-05' && r.category === 'Gas') r.amount = r.date.endsWith('08') ? 3512.4 : 2508.6;
}

export const DEMO_ROWS = [...augRows, ...julRows, ...priorRows];

export function demoSnapshot() {
  return {
    rows: DEMO_ROWS.map((r) => ({ ...r })),
    budgets: DEMO_BUDGETS.map((b) => ({ ...b })),
  };
}

/** The parse the demo capture returns — the design's 1c result. */
export const DEMO_CAPTURE_RESULT = {
  ok: true,
  message: 'Logged ₱105 · Coffee · Pickup Coffee · GCash',
  date: '2026-08-10',
  time: '14:12',
  category: 'Coffee',
  vendor: 'Pickup Coffee',
  item: 'Iced Caramel Latte',
  amount: 105,
  paid_via: 'GCash',
  review: '',
};
