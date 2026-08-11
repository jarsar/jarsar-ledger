// The demo book. Same surface as the real adapter, served from memory with
// plausible latency, so every screen and every failure state can be walked
// without a credential ever being typed.

import { demoSnapshot, DEMO_NOW, DEMO_CAPTURE_RESULT } from '../data/demoData';
import { ApiError } from './client';

const STORE_KEY = 'jarsar_demo_rows_v1';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* a demo that cannot persist is still a demo */
  }
  return demoSnapshot().rows;
}

function save(rows) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

let rows = null;
const ensure = () => (rows ??= load());

export function resetDemo() {
  rows = demoSnapshot().rows;
  save(rows);
}

export function emptyDemo() {
  rows = [];
  save(rows);
}

const nextId = () => Math.random().toString(16).slice(2, 10);

export function createDemoClient() {
  return {
    async ping() {
      await wait(320);
      return { ok: true, count: demoSnapshot().budgets.length };
    },

    async list(month) {
      await wait(380);
      const all = ensure();
      return month ? all.filter((r) => r.month === month) : all.slice(-200);
    },

    async budgets() {
      await wait(300);
      return demoSnapshot().budgets;
    },

    /**
     * The parse takes as long as a real one. Typed words stand in for the
     * three ways it can go wrong, so the exception screens are reachable:
     *   "fail"  → the back office is unreachable
     *   "cat"   → that isn't a receipt
     *   "blur"  → filed, but flagged for review
     */
    async capture(payload) {
      const text = String(payload.text || '').toLowerCase();
      await wait(3800);

      if (text.includes('fail')) {
        throw new ApiError('network', 'The back office is unreachable.', { retriable: true });
      }
      if (text.includes('cat')) {
        throw new ApiError('not-receipt', "That doesn't look like a receipt — nothing logged.");
      }

      const flagged = text.includes('blur');
      const result = {
        ...DEMO_CAPTURE_RESULT,
        id: nextId(),
        review: flagged ? 'check' : '',
        ...(flagged
          ? {
              vendor: 'Seven Eleven',
              item: 'Sundries — total unclear',
              amount: 168,
              category: 'Buffer',
              paid_via: 'Cash',
              message: 'Logged ₱168 · Buffer · Seven Eleven · Cash — flagged for review',
            }
          : {}),
      };

      ensure().push({
        id: result.id,
        date: result.date,
        time: result.time,
        month: result.date.slice(0, 7),
        category: result.category,
        vendor: result.vendor,
        item: result.item,
        amount: result.amount,
        paid_via: result.paid_via,
        notes: flagged ? 'Filed at low confidence. Confirm the figures below.' : '',
        review: result.review,
        source: 'app',
      });
      save(rows);
      return result;
    },

    async update(id, fields) {
      await wait(600);
      const all = ensure();
      const i = all.findIndex((r) => r.id === id);
      if (i === -1) throw new ApiError('backend', `No entry with id ${id}.`);
      const next = { ...all[i], ...fields };
      if (fields.date) next.month = String(fields.date).slice(0, 7);
      // A human edit is certification: the flag clears unless it is set on purpose.
      next.review = 'review' in fields ? fields.review : '';
      all[i] = next;
      save(all);
      return next;
    },

    async remove(id) {
      await wait(500);
      rows = ensure().filter((r) => r.id !== id);
      save(rows);
      return { ok: true };
    },

    /** The demo clock is pinned, which is what makes its pace figures hold. */
    now() {
      return DEMO_NOW;
    },
  };
}
