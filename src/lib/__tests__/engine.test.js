// The engine is the product's one load-bearing calculation. These tests hold
// it to the figures the design published.

import { describe, it, expect } from 'vitest';
import {
  buildMonthModel,
  heroSeries,
  topVendors,
  docketOf,
  trendSeries,
  settledCategories,
} from '../selectors';
import { radarSignals } from '../radar';
import { manilaToday, peso, pesoFlat, entryNo } from '../format';
import { DEMO_ROWS, DEMO_BUDGETS, DEMO_NOW } from '../../data/demoData';

const today = manilaToday(DEMO_NOW);
const julRows = DEMO_ROWS.filter((r) => r.month === '2026-07');
const aug = buildMonthModel(DEMO_ROWS, DEMO_BUDGETS, today, '2026-08', julRows);
const jul = buildMonthModel(DEMO_ROWS, DEMO_BUDGETS, today, '2026-07');

const cat = (model, name) => model.byCategory.find((c) => c.category === name);

describe('the clock', () => {
  it('is pinned to day 10 of 31, August 2026, Manila', () => {
    expect(today.month).toBe('2026-08');
    expect(today.day).toBe(10);
    expect(today.daysInMonth).toBe(31);
  });
});

describe('August — the open month', () => {
  it('totals ₱57,820.73', () => {
    expect(aug.monthTotal).toBeCloseTo(57820.73, 2);
  });

  it('caps total ₱76,548 and reads 75.5% drawn', () => {
    expect(aug.capTotal).toBe(76548);
    expect(aug.pctDrawn.toFixed(1)).toBe('75.5');
  });

  it('files 47 entries', () => {
    expect(aug.entryCount).toBe(47);
  });

  it('reproduces the design’s category figures', () => {
    expect(cat(aug, 'Gas').spent).toBeCloseTo(3458.73, 2);
    expect(cat(aug, 'Utilities').spent).toBe(1842);
    expect(cat(aug, 'Transport').spent).toBe(1524);
    expect(cat(aug, 'Food').spent).toBeCloseTo(4918, 2);
    expect(cat(aug, 'Sports').spent).toBe(2734);
    expect(cat(aug, 'Coffee').spent).toBe(1246);
    expect(cat(aug, 'Parking').spent).toBe(260);
  });

  it('settles the fixed bills and marks the pace on the rest', () => {
    expect(cat(aug, 'Rent').chip.text).toBe('SETTLED AUG 1');
    expect(cat(aug, 'Internet').chip.text).toBe('SETTLED AUG 5');
    expect(cat(aug, 'Mobile').chip.text).toBe('SETTLED AUG 3');
    expect(cat(aug, 'Gas').chip.text).toBe('+26 VS PACE');
    expect(cat(aug, 'Utilities').chip.text).toBe('+14 VS PACE');
    expect(cat(aug, 'Coffee').chip.text).toBe('+10 VS PACE');
    expect(cat(aug, 'Sports').chip.text).toBe('1 SESSION BREACHES');
    expect(cat(aug, 'Food').chip.text).toBe('CLEARS THE MONTH');
    expect(cat(aug, 'Parking').chip.text).toBe('NO CAP · TRACKED');
    expect(cat(aug, 'Pets').chip.text).toBe('ON TRACK');
  });

  it('colours breach coral, pace amber, clearance mint', () => {
    expect(cat(aug, 'Sports').chip.kind).toBe('coral');
    expect(cat(aug, 'Gas').chip.kind).toBe('amber');
    expect(cat(aug, 'Food').chip.kind).toBe('mint');
    expect(cat(aug, 'Rent').chip.kind).toBe('grey');
  });

  it('orders the groups Essential, Lifestyle, Other and keeps Funds apart', () => {
    expect(aug.groups.map((g) => g.name)).toEqual(['Essential', 'Lifestyle', 'Other']);
    expect(aug.funds.map((f) => f.category)).toContain('Gadgets');
    expect(aug.groups.flatMap((g) => g.categories).find((c) => c.category === 'Gadgets')).toBeUndefined();
  });
});

describe('the usual price', () => {
  // "One more session breaches" promises a figure. Only categories that
  // actually have a usual price get to make that promise.
  it('holds for indoor golf, which always costs the same', () => {
    expect(cat(aug, 'Sports').recurring).toBeGreaterThan(1200);
    expect(cat(aug, 'Sports').chip.text).toBe('1 SESSION BREACHES');
  });

  it('does not hold for a tank of petrol, so Gas is judged on pace instead', () => {
    expect(cat(aug, 'Gas').recurring).toBeNull();
    expect(cat(aug, 'Gas').chip.text).toBe('+26 VS PACE');
  });
});

describe('the hero chart', () => {
  it('lands the dot where the design draws it', () => {
    const s = heroSeries(aug);
    expect(s.dot.x).toBeCloseTo(129.7, 0);
    expect(s.dot.y).toBeCloseTo(34, 0);
  });

  it('runs the pace line corner to corner', () => {
    const s = heroSeries(aug);
    expect(s.pace).toEqual({ x1: 0, y1: 116, x2: 402, y2: 8 });
  });
});

describe('July — closed and certified', () => {
  it('is marked closed and hides the pace tick', () => {
    expect(jul.closed).toBe(true);
    expect(jul.pacePct).toBe(100);
  });

  it('reports Coffee as breached by 7% — the month’s one bad mark', () => {
    expect(cat(jul, 'Coffee').chip.text).toBe('BREACHED +7%');
    expect(cat(jul, 'Coffee').chip.kind).toBe('coral');
  });

  it('closes the rest under cap', () => {
    expect(cat(jul, 'Gas').chip.text).toBe('CLOSED −4%');
    expect(cat(jul, 'Utilities').chip.text).toBe('CLOSED AT CAP');
    expect(cat(jul, 'Food').chip.text).toBe('CLOSED −7%');
    expect(cat(jul, 'Sports').chip.text).toBe('CLOSED −3%');
    expect(cat(jul, 'Transport').chip.text).toBe('CLOSED −18%');
  });

  // The design frame prints ₱63,118.40 for July, but its own category rows
  // sum to ~₱74k — the two contradict each other in the source. Rows win:
  // the hero is computed, never asserted.
  it('totals what its rows total', () => {
    const rowSum = jul.rows.reduce((a, r) => a + r.amount, 0);
    expect(jul.monthTotal).toBeCloseTo(rowSum, 2);
  });
});

describe('the trend', () => {
  it('reads MAR through AUG with August current', () => {
    const totals = {
      '2026-03': 61200, '2026-04': 58100, '2026-05': 66900,
      '2026-06': 59300, '2026-07': 63118.4, '2026-08': 57820.73,
    };
    const t = trendSeries(totals, '2026-08');
    expect(t).toHaveLength(6);
    expect(t[0].month).toBe('2026-03');
    expect(t[5].current).toBe(true);
    expect(t[2].heightPct).toBe(100); // May is the tallest
  });
});

describe('counterparties and the docket', () => {
  it('ranks Shell first, with the landlord and the telco left out', () => {
    const vendors = topVendors(aug.rows, 5, settledCategories(aug));
    expect(vendors[0].vendor).toBe('Shell');
    expect(vendors.map((v) => v.vendor)).not.toContain('JarSar Property');
    expect(vendors.map((v) => v.vendor)).toContain('GolfZon');
  });

  it('counts a counterparty’s visits, not just its value', () => {
    const grab = topVendors(aug.rows, 20, settledCategories(aug)).find((v) => v.vendor === 'Grab');
    expect(grab.count).toBe(7);
  });

  it('holds three entries waiting on a human', () => {
    const d = docketOf(aug.rows);
    expect(d).toHaveLength(3);
    expect(d.map((r) => r.vendor)).toContain('Soban K-Town Grill');
  });
});

describe('radar', () => {
  const history = DEMO_ROWS.filter((r) => r.month < '2026-08');
  const signals = radarSignals(aug, history, today, {});

  it('flags Coffee ahead of pace with a projected close of ₱3,863', () => {
    const flag = signals.find((s) => s.severity === 'flag' && s.category === 'Coffee');
    expect(flag).toBeTruthy();
    expect(flag.body).toContain('₱3,863');
    expect(flag.title).toMatch(/Coffee is \d+% ahead of pace/);
  });

  it('advises that Sports is one session from the cap, rather than flagging a percentage', () => {
    const adv = signals.find((s) => s.severity === 'advisory' && s.category === 'Sports');
    expect(adv).toBeTruthy();
    expect(adv.body).toContain('GolfZon');
    expect(signals.find((s) => s.severity === 'flag' && s.category === 'Sports')).toBeUndefined();
  });

  it('notices the Grab frequency', () => {
    expect(signals.find((s) => s.key.startsWith('freq:Grab'))).toBeTruthy();
  });

  it('notices the Gas entry as the largest since May, citing the May high', () => {
    const notice = signals.find((s) => s.key.startsWith('largest:Gas'));
    expect(notice).toBeTruthy();
    expect(notice.title).toContain('since May');
    expect(notice.body).toContain('₱3,512.40');
  });

  it('says nothing about a category with no cap', () => {
    expect(signals.find((s) => s.category === 'Parking')).toBeUndefined();
  });

  // Gas is ₱3,458.73 of ₱6,000 on day 10 — well ahead of the line. But it is
  // one tank. Multiplying that into a "projected close" would be a forecast
  // with nothing behind it.
  it('will not forecast a run rate from a single purchase', () => {
    expect(cat(aug, 'Gas').entryCount).toBe(1);
    expect(signals.find((s) => s.severity === 'flag' && s.category === 'Gas')).toBeUndefined();
  });

  // The dashboard card and the analyst read the same evidence. If the card
  // says a category clears the month, Radar does not turn round and flag it.
  it('never contradicts a CLEARS THE MONTH card', () => {
    expect(cat(aug, 'Food').chip.text).toBe('CLEARS THE MONTH');
    expect(signals.find((s) => s.severity === 'flag' && s.category === 'Food')).toBeUndefined();
  });

  it('sorts flags above advisories above notices', () => {
    const order = signals.map((s) => s.severity);
    expect(order).toEqual([...order].sort((a, b) =>
      ({ flag: 0, advisory: 1, notice: 2 })[a] - ({ flag: 0, advisory: 1, notice: 2 })[b]));
  });

  it('honours a dismissal', () => {
    const key = signals[0].key;
    expect(radarSignals(aug, history, today, { [key]: today.iso }).find((s) => s.key === key)).toBeUndefined();
  });
});

describe('formatting', () => {
  it('splits the hero figure into weight and whisper', () => {
    expect(peso(57820.73)).toEqual({ int: '57,820', dec: '.73' });
    expect(peso(105)).toEqual({ int: '105', dec: '.00' });
  });

  it('writes pesos the way the book does', () => {
    expect(pesoFlat(1234.5)).toBe('₱1,234.50');
  });

  // Summing forty-odd floats can land on 74195.99999999999, whose fractional
  // part rounds to 100 and would print as "₱74,195.100".
  it('does not let float drift print a third decimal', () => {
    expect(peso(74195.99999999999)).toEqual({ int: '74,196', dec: '.00' });
    expect(peso(0.005)).toEqual({ int: '0', dec: '.01' });
  });

  it('shortens an id into a serial without pretending it is a sequence', () => {
    expect(entryNo('6a36594d')).toBe('№ 6A36');
    expect(entryNo('')).toBe('№ —');
  });
});
