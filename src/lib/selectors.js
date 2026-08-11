// The aggregates engine. Pure functions, no imports beyond formatting, no
// globals: "today" is always injected so the whole thing is testable.
//
// The server returns rows and budgets and nothing else — every figure the
// dashboard shows is computed here.

import {
  daysInMonthOf,
  isoOfDay,
  monthDayLabel,
  addDays,
  daysBetween,
  monthOf,
  pesoRound,
} from './format';

const GROUP_ORDER = ['Essential', 'Lifestyle', 'Other'];

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The typical size of a purchase in this category — needs a real habit to exist. */
export function typicalEntry(rows, category, { minEntries = 3 } = {}) {
  const amounts = rows.filter((r) => r.category === category).map((r) => Number(r.amount) || 0);
  if (amounts.length < minEntries) return null;
  return median(amounts);
}

/**
 * The category's *usual price*, or null if it hasn't got one.
 *
 * "One more session breaches" is only an honest thing to say when the next
 * purchase has a predictable size — a round of indoor golf is always ₱1,367.
 * A tank of petrol depends on how empty you were, so no figure is promised.
 */
export function recurringPrice(rows, category, { minEntries = 2, spread = 1.15 } = {}) {
  const amounts = rows
    .filter((r) => r.category === category)
    .map((r) => Number(r.amount) || 0)
    .filter((a) => a > 0);
  if (amounts.length < minEntries) return null;
  const lo = Math.min(...amounts);
  const hi = Math.max(...amounts);
  if (lo <= 0 || hi / lo > spread) return null;
  return median(amounts);
}

/**
 * The chip vocabulary. First match wins, and the order is the argument:
 * an uncapped category can't breach, a settled bill isn't "ahead of pace",
 * and a real breach outranks a projection.
 */
export function chipFor(cat, ctx) {
  const { spent, cap, entryCount, lastEntryDate } = cat;
  const { pacePct, closed, recurring } = ctx;

  if (cap == null) return { text: 'NO CAP · TRACKED', kind: 'grey', bar: 'none' };

  const pct = cap > 0 ? (spent / cap) * 100 : 0;
  const atCap = Math.abs(spent - cap) <= Math.max(1, cap * 0.005);

  // A fixed bill: drawn in full, in one or two instalments. Not a category
  // that merely crawled to its cap over twenty entries.
  if (atCap && entryCount <= 2) {
    return {
      text: closed ? 'SETTLED' : `SETTLED ${monthDayLabel(lastEntryDate)}`,
      kind: 'grey',
      bar: 'settled',
      pct,
    };
  }

  if (closed) {
    if (spent > cap * 1.005) return { text: `BREACHED +${Math.round(pct - 100)}%`, kind: 'coral', bar: 'coral', pct };
    if (atCap) return { text: 'CLOSED AT CAP', kind: 'mint', bar: 'teal', pct };
    return { text: `CLOSED −${Math.round(100 - pct)}%`, kind: 'mint', bar: 'teal', pct };
  }

  if (spent > cap) return { text: `BREACHED +${Math.round(pct - 100)}%`, kind: 'coral', bar: 'coral', pct };

  const remaining = cap - spent;
  if (recurring != null && remaining <= recurring) {
    const sessions = Math.max(1, Math.ceil(remaining / recurring));
    return {
      text: sessions === 1 ? '1 SESSION BREACHES' : `${sessions} SESSIONS BREACH`,
      kind: 'coral',
      bar: 'coral',
      pct,
    };
  }

  const ahead = Math.round(pct) - Math.round(pacePct);
  if (ahead <= 5) return { text: 'ON TRACK', kind: 'mint', bar: 'teal', pct };

  // Ahead of the straight line, but the last week's rate clears the cap: a
  // front-loaded month, not a runaway one. Only categories bought often
  // enough to have a rhythm get this reading — a monthly bill has no
  // meaningful weekly rate, and pretending otherwise would flatter it.
  if (cat.clearsAtRecentRate) {
    return { text: 'CLEARS THE MONTH', kind: 'mint', bar: 'teal', pct };
  }

  return { text: `+${ahead} VS PACE`, kind: 'amber', bar: 'teal', pct };
}

/**
 * Everything the dashboard needs for one month, computed from raw rows.
 * `today` is the manilaToday() shape; `month` may be any month present.
 */
export function buildMonthModel(rows, budgets, today, month = today.month, prevRows = []) {
  const monthRows = rows.filter((r) => r.month === month);
  const closed = month < today.month;
  const daysInMonth = daysInMonthOf(month);
  const day = closed ? daysInMonth : month === today.month ? today.day : daysInMonth;
  const pacePct = closed ? 100 : (day / daysInMonth) * 100;
  const daysLeft = Math.max(0, daysInMonth - day);

  const budgetOf = new Map(budgets.map((b) => [b.category, b]));

  // Categories come from both sides: a budget with no spend still shows,
  // and a spend with no budget is not silently dropped.
  const names = new Set([...budgets.map((b) => b.category), ...monthRows.map((r) => r.category)]);

  const byCategory = [...names].map((name) => {
    const b = budgetOf.get(name);
    const entries = monthRows.filter((r) => r.category === name);
    const spent = sum(entries.map((r) => Number(r.amount) || 0));
    const dates = entries.map((r) => r.date).filter(Boolean).sort();
    const cap = b && b.monthly != null ? Number(b.monthly) : null;

    // The trailing-week run rate, and the typical purchase across this month
    // and the last — both used by the chip cascade.
    const windowStart = closed ? null : addDays(today.iso, -6);
    const recent = windowStart ? entries.filter((r) => r.date >= windowStart) : [];
    const rate7 = closed ? null : sum(recent.map((r) => Number(r.amount) || 0)) / Math.min(7, Math.max(1, day));
    const habit = [...entries, ...prevRows.filter((r) => r.category === name)];
    const typical = typicalEntry(habit, name);
    const recurring = recurringPrice(habit, name);

    const cat = {
      category: name,
      group: b?.group || 'Other',
      spent,
      cap,
      entries,
      entryCount: entries.length,
      lastEntryDate: dates[dates.length - 1] || null,
      pct: cap && cap > 0 ? (spent / cap) * 100 : 0,
      typical,
      recurring,
      rate7,
      // The last week's rate, carried through the month. Radar and the chip
      // both read this, so the dashboard and the analyst never disagree.
      clearsAtRecentRate:
        cap != null && rate7 != null && entries.length >= 4 && spent + rate7 * daysLeft <= cap,
    };
    cat.chip = chipFor(cat, { pacePct, closed, recurring });
    return cat;
  });

  const funds = byCategory
    .filter((c) => c.group === 'Fund')
    .sort((a, b) => b.spent - a.spent);

  const groups = GROUP_ORDER.map((g) => {
    const cats = byCategory
      .filter((c) => c.group === g)
      .sort((a, b) => b.spent - a.spent || a.category.localeCompare(b.category));
    return {
      name: g,
      categories: cats,
      subtotal: sum(cats.map((c) => c.spent)),
      cap: sum(cats.filter((c) => c.cap != null).map((c) => c.cap)),
    };
  }).filter((g) => g.categories.length);

  const monthTotal = sum(monthRows.map((r) => Number(r.amount) || 0));
  const capTotal = sum(byCategory.filter((c) => c.group !== 'Fund' && c.cap != null).map((c) => c.cap));

  return {
    month,
    closed,
    day,
    daysInMonth,
    pacePct,
    daysLeft,
    rows: monthRows,
    entryCount: monthRows.length,
    monthTotal,
    capTotal,
    pctDrawn: capTotal > 0 ? (monthTotal / capTotal) * 100 : 0,
    groups,
    funds,
    byCategory,
  };
}

/**
 * The hero chart, in the design's fixed 402×130 viewBox: a cumulative
 * white line against the amber dashed diagonal that is "on budget by
 * month end".
 */
export function heroSeries(model) {
  const { rows, capTotal, day, daysInMonth, monthTotal } = model;
  const W = 402;
  const TOP = 8;
  const BASE = 116;
  const span = BASE - TOP;

  const x = (d) => (W * d) / daysInMonth;
  const y = (v) => (capTotal > 0 ? BASE - span * Math.min(v / capTotal, 1) : BASE);

  const byDay = new Map();
  for (const r of rows) {
    const d = Number(String(r.date || '').slice(8, 10));
    if (!d) continue;
    byDay.set(d, (byDay.get(d) || 0) + (Number(r.amount) || 0));
  }

  const pts = [[0, BASE]];
  let running = 0;
  for (let d = 1; d <= day; d++) {
    running += byDay.get(d) || 0;
    pts.push([x(d), y(running)]);
  }

  const last = pts[pts.length - 1];
  return {
    points: pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' '),
    // A closed month ends exactly on the frame's right edge; pull the marker
    // in so it reads as a dot rather than a clipped half-circle.
    dot: { x: Math.min(last[0], W - 7), y: last[1] },
    pace: { x1: 0, y1: BASE, x2: W, y2: TOP },
    total: monthTotal,
  };
}

/** Six months of totals for the trend card; missing months stay gaps. */
export function trendSeries(monthTotals, currentMonth, n = 6) {
  const months = [];
  const [y, m] = currentMonth.split('-').map(Number);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const values = months.map((mo) => monthTotals[mo]);
  const max = Math.max(...values.filter((v) => typeof v === 'number'), 0);
  return months.map((mo) => ({
    month: mo,
    total: monthTotals[mo],
    known: typeof monthTotals[mo] === 'number',
    heightPct: max > 0 && typeof monthTotals[mo] === 'number' ? (monthTotals[mo] / max) * 100 : 0,
    current: mo === currentMonth,
  }));
}

/**
 * The counterparties card. Settled fixed bills are left out: a landlord and a
 * telco are obligations, not counterparties you decide about, and at ₱36,250
 * the landlord would simply flatten the list.
 */
export function topVendors(rows, n = 5, exclude = new Set()) {
  const tally = new Map();
  for (const r of rows) {
    if (exclude.has(r.category)) continue;
    const key = String(r.vendor || '').trim() || '—';
    const cur = tally.get(key) || { vendor: key, count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += Number(r.amount) || 0;
    tally.set(key, cur);
  }
  return [...tally.values()].sort((a, b) => b.sum - a.sum).slice(0, n);
}

/** Rows the parser could not certify on its own. */
export function docketOf(rows) {
  const seen = new Set();
  return rows
    .filter((r) => String(r.review || '').toLowerCase() === 'check')
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

/** Activity's day sections: Today, Yesterday, then dated. */
export function groupByDay(rows, today) {
  const byDate = new Map();
  for (const r of rows) {
    if (!r.date) continue;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => {
      const delta = daysBetween(date, today.iso);
      return {
        date,
        label: delta === 0 ? 'Today' : delta === 1 ? 'Yesterday' : null,
        total: sum(list.map((r) => Number(r.amount) || 0)),
        rows: list.sort((a, b) => String(b.time || '').localeCompare(String(a.time || ''))),
      };
    });
}

/** Which doors have delivered, and when. Only the three real ones. */
export function doorsStatus(rows) {
  const doors = { shortcut: null, gmail: null, app: null };
  for (const r of rows) {
    const src = String(r.source || '').toLowerCase();
    if (!(src in doors)) continue;
    const stamp = `${r.date} ${r.time || ''}`.trim();
    if (!doors[src] || stamp > doors[src].stamp) doors[src] = { stamp, date: r.date, time: r.time };
  }
  return doors;
}

/** Categories drawn in full by one or two fixed instalments. */
export function settledCategories(model) {
  return new Set(model.byCategory.filter((c) => c.chip.bar === 'settled').map((c) => c.category));
}

/**
 * The categories the board will ask about — which are, by definition, the
 * ones Radar has already raised. One ranking, not two that could disagree.
 */
export function questionedCategories(signals, n = 2) {
  const out = [];
  for (const s of signals) {
    if (s.category && !out.includes(s.category)) out.push(s.category);
    if (out.length === n) break;
  }
  return out;
}

/** Projected close and breach date at the month's running rate. */
export function projection(cat, model) {
  const { day, daysInMonth } = model;
  if (!cat.cap || day <= 0 || cat.spent <= 0) return null;
  const perDay = cat.spent / day;
  const projected = perDay * daysInMonth;
  const breachDay = Math.ceil(cat.cap / perDay);
  return {
    perDay,
    projected,
    projectedLabel: pesoRound(projected),
    breachDay: breachDay <= daysInMonth ? breachDay : null,
    breachDate: breachDay <= daysInMonth ? isoOfDay(model.month, breachDay) : null,
    breaches: projected > cat.cap,
  };
}

export { monthOf, sum, median };
