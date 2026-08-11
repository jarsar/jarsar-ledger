// Radar: the analyst's feed. Every signal is computed from rows the app
// already holds — nothing is fetched, nothing is stored server-side except
// the rows themselves. Thresholds are stated here, once.

import { projection, typicalEntry, sum } from './selectors';
import { addDays, dayLabel, pesoFlat, pesoRound, monthName } from './format';

export const THRESHOLDS = {
  FLAG_AHEAD: 0.25, // 25% ahead of where the month should be
  FLAG_MIN_DAY: 5, // before day 5 the arithmetic is noise
  FLAG_MIN_ENTRIES: 3, // a run rate needs a run: one tank of petrol isn't one
  FREQ_MIN_COUNT: 5, // fares in the trailing fortnight
  FREQ_MULTIPLE: 2, // versus the trailing average
  LARGEST_MIN: 500, // pesos — below this, "largest" isn't news
  LARGEST_RECENT: 60, // days it must beat outright
};

/**
 * @param model  the current month's model (buildMonthModel)
 * @param history rows from earlier months, for baselines
 * @param today  manilaToday()
 * @param dismissed { [key]: isoDate }
 */
export function radarSignals(model, history, today, dismissed = {}) {
  const signals = [];

  // A category bought in a few large pieces is better described by "one more
  // breaches" than by a percentage against a straight line — the pace maths
  // is noise when the purchases are lumpy. Those categories take the
  // advisory and are kept out of the flag rule.
  const oneAway = new Set(
    model.byCategory
      .filter(
        (c) =>
          c.cap != null &&
          c.cap > 0 &&
          c.spent < c.cap &&
          c.recurring != null &&
          c.cap - c.spent <= c.recurring
      )
      .map((c) => c.category)
  );

  // ── FLAG · a category running away from its cap ──────────────
  for (const cat of model.byCategory) {
    if (cat.cap == null || cat.cap <= 0 || model.day < THRESHOLDS.FLAG_MIN_DAY) continue;
    if (oneAway.has(cat.category)) continue;
    // "Projected close" multiplies a rate by the month. With one or two
    // entries there is no rate to multiply — it would be arithmetic dressed
    // up as a forecast.
    if (cat.entryCount < THRESHOLDS.FLAG_MIN_ENTRIES) continue;
    // The dashboard reads this category as clearing the month on its recent
    // rate. Radar must not contradict the card the user just looked at — a
    // front-loaded month is not a runaway one.
    if (cat.clearsAtRecentRate) continue;
    const expected = cat.cap * (model.day / model.daysInMonth);
    if (expected <= 0) continue;
    const ahead = cat.spent / expected - 1;
    if (ahead < THRESHOLDS.FLAG_AHEAD) continue;

    const p = projection(cat, model);
    if (!p || !p.breaches) continue;

    signals.push({
      key: `pace:${cat.category}:${model.month}`,
      severity: 'flag',
      label: 'FLAG',
      category: cat.category,
      at: `${String(today.time)}`,
      title: `${cat.category} is ${Math.round(ahead * 100)}% ahead of pace`,
      body:
        `${pesoRound(cat.spent)} of ${pesoRound(cat.cap)} on day ${model.day}. ` +
        `Projected close ${p.projectedLabel} — the cap breaches ` +
        `${p.breachDate ? dayLabel(p.breachDate) : 'before month end'} at this rate.`,
      spark: { type: 'pace', category: cat.category },
      action: { label: `View ${cat.category} →`, href: `/?focus=${encodeURIComponent(cat.category)}` },
    });
  }

  // ── ADVISORY · one ordinary purchase from the cap ────────────
  for (const cat of model.byCategory) {
    if (!oneAway.has(cat.category)) continue;
    const typical = cat.recurring;
    const vendor = frequentVendor(cat.entries);
    signals.push({
      key: `advisory:${cat.category}:${model.month}`,
      severity: 'advisory',
      label: 'ADVISORY',
      category: cat.category,
      at: dayLabel(today.iso),
      title: `${cat.category}: one session from the cap`,
      body:
        `${pesoRound(cat.spent)} of ${pesoRound(cat.cap)} with ${model.daysLeft} days left. ` +
        `One more ${vendor || 'entry'} at the usual ${pesoFlat(typical)} breaches.`,
      action: { label: `View ${cat.category} →`, href: `/?focus=${encodeURIComponent(cat.category)}` },
    });
  }

  const all = [...model.rows, ...history];

  // ── NOTICE · a counterparty appearing more than it used to ───
  const fortnightStart = addDays(today.iso, -13);
  const baselineStart = addDays(today.iso, -69);
  const vendors = new Set(model.rows.map((r) => String(r.vendor || '').trim()).filter(Boolean));

  for (const vendor of vendors) {
    const mine = all.filter((r) => String(r.vendor || '').trim() === vendor);
    const n14 = mine.filter((r) => r.date >= fortnightStart).length;
    if (n14 < THRESHOLDS.FREQ_MIN_COUNT) continue;

    const priorWindow = mine.filter((r) => r.date >= baselineStart && r.date < fortnightStart);
    const oldest = all.map((r) => r.date).filter(Boolean).sort()[0];
    if (!oldest || oldest > addDays(today.iso, -28)) continue; // not enough history to claim a baseline

    const baseline = priorWindow.length / 4; // four prior fortnights
    if (baseline > 0 && n14 < baseline * THRESHOLDS.FREQ_MULTIPLE) continue;

    const bars = [0, 1, 2, 3, 4].map((i) => {
      const end = addDays(today.iso, -14 * i + (i === 0 ? 1 : 0));
      const start = addDays(today.iso, -14 * (i + 1) + 1);
      return mine.filter((r) => r.date >= start && r.date < end).length;
    }).reverse();

    signals.push({
      key: `freq:${vendor}:${model.month}`,
      severity: 'notice',
      label: 'NOTICE',
      category: mine[0]?.category,
      at: dayLabel(today.iso),
      title: `${vendor} frequency elevated`,
      body:
        `${n14} entries this fortnight versus a trailing average of ${baseline.toFixed(1)}. ` +
        `The pattern, not the amounts, is the anomaly.`,
      spark: { type: 'bars', bars },
      action: { label: `View ${vendor} →`, href: `/activity?q=${encodeURIComponent(vendor)}` },
    });
  }

  // ── NOTICE · the largest entry a category has seen in months ─
  // "Largest since May" means: bigger than everything since May, and the May
  // entry is the one it is measured against. So the test is against the
  // recent window, and the citation reaches back to the last higher entry.
  const recentStart = addDays(today.iso, -THRESHOLDS.LARGEST_RECENT);
  const monthStart = `${model.month}-01`;

  for (const cat of model.byCategory) {
    if (!cat.entries.length) continue;
    const biggest = cat.entries.reduce((a, b) => (Number(b.amount) > Number(a.amount) ? b : a));
    const amount = Number(biggest.amount) || 0;
    if (amount < THRESHOLDS.LARGEST_MIN) continue;

    const catHistory = history.filter((r) => r.category === cat.category && r.date < monthStart);
    const recent = catHistory.filter((r) => r.date >= recentStart);
    if (!recent.length) continue;
    if (recent.some((r) => Number(r.amount) >= amount)) continue;

    const higher = catHistory
      .filter((r) => Number(r.amount) > amount)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!higher) continue;

    signals.push({
      key: `largest:${cat.category}:${biggest.id}`,
      severity: 'notice',
      label: 'NOTICE',
      category: cat.category,
      at: dayLabel(biggest.date),
      title: `Largest ${cat.category} entry since ${monthName(String(higher.date).slice(0, 7))}`,
      body:
        `${biggest.vendor}, ${pesoFlat(amount)} on ${dayLabel(biggest.date)}. ` +
        `Prior high ${pesoFlat(higher.amount)} on ${dayLabel(higher.date)}.`,
      action: { label: `View ${cat.category} →`, href: `/?focus=${encodeURIComponent(cat.category)}` },
    });
  }

  const rank = { flag: 0, advisory: 1, notice: 2 };
  return signals
    .filter((s) => !dismissed[s.key])
    .sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function frequentVendor(entries) {
  const tally = new Map();
  for (const e of entries) {
    const v = String(e.vendor || '').trim();
    if (v) tally.set(v, (tally.get(v) || 0) + 1);
  }
  const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

/** Flags and advisories stand until the month turns; notices lapse in a week. */
export function isExpired(key, stampedIso, today) {
  if (key.startsWith('freq:') || key.startsWith('largest:')) {
    return stampedIso < addDays(today.iso, -7);
  }
  return String(stampedIso).slice(0, 7) < today.month;
}

export { sum, typicalEntry };
