// A cache of what the book has already told us. Closed months never change
// on their own, so they are kept; the open month is refreshed whenever the
// app comes back to the front.
//
// The one thing this cannot know is a row edited by hand in the sheet — so
// More carries a resync that clears everything here and asks again.

const PREFIX = 'jarsar_cache_v1_';
const DEMO_PREFIX = 'jarsar_demo_cache_v1_';

const base = (demo) => (demo ? DEMO_PREFIX : PREFIX);

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — the app works, it just re-fetches */
  }
}

export const cache = {
  readMonth(demo, month) {
    return read(`${base(demo)}month_${month}`);
  },
  writeMonth(demo, month, rows) {
    write(`${base(demo)}month_${month}`, { rows, fetchedAt: Date.now() });
  },
  readBudgets(demo) {
    return read(`${base(demo)}budgets`);
  },
  writeBudgets(demo, budgets) {
    write(`${base(demo)}budgets`, { budgets, fetchedAt: Date.now() });
  },
  readDismissed(demo) {
    return read(`${base(demo)}dismissed`) || {};
  },
  writeDismissed(demo, dismissed) {
    write(`${base(demo)}dismissed`, dismissed);
  },

  /** Forget every cached month and budget for this mode. */
  clear(demo) {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(base(demo)))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  },
};
