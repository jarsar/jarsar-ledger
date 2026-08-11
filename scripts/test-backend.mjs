// Runs the Code.gs handlers against a simulated spreadsheet.
//
// Apps Script cannot be unit-tested in place, and the live book is the
// owner's real money record — so the globals are stubbed here and the
// handlers are exercised before anything is pasted into the editor.
//
//   node scripts/test-backend.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'Code.gs'), 'utf8');

let failures = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
};
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what || ''} expected ${b}, got ${a}`);
};

// ── a spreadsheet, near enough ───────────────────────────────
const HEADERS = ['Date', 'Time', 'Month', 'Category', 'Vendor', 'Item', 'Amount',
  'Paid Via', 'Notes', 'Review', 'Source', 'Receipt', 'Logged At', 'ID'];

const d = (iso) => { const [y, m, day] = iso.split('-').map(Number); return new Date(y, m - 1, day); };
const t = (iso, hm) => {
  const [y, m, day] = iso.split('-').map(Number);
  const [h, min] = hm.split(':').map(Number);
  return new Date(y, m - 1, day, h, min);
};

function makeSheet(name, rows) {
  const data = [rows.headers, ...rows.body];
  return {
    name,
    data,
    getLastRow: () => data.length,
    getDataRange: () => ({ getValues: () => data.map((r) => [...r]) }),
    getRange(row, col, numRows = 1, numCols = 1) {
      return {
        getValues: () =>
          data.slice(row - 1, row - 1 + numRows).map((r) => r.slice(col - 1, col - 1 + numCols)),
        setValues: (vals) => {
          vals.forEach((r, i) => {
            r.forEach((v, j) => {
              data[row - 1 + i][col - 1 + j] = v;
            });
          });
        },
        setNumberFormat: () => {},
      };
    },
    deleteRow(r) { data.splice(r - 1, 1); },
    appendRow(r) { data.push(r); },
  };
}

function buildContext(expenseBody, budgetBody) {
  const expenses = makeSheet('Expenses', { headers: HEADERS, body: expenseBody });
  const budgets = makeSheet('Budgets', {
    headers: ['Category', 'Monthly Budget', 'Group', 'Hints for the AI'],
    body: budgetBody,
  });

  const pad = (n, w = 2) => String(n).padStart(w, '0');

  const ctx = {
    console,
    // Share the host's Date so `cell instanceof Date` means the same thing
    // inside the sandbox as it does in these assertions.
    Date,
    Logger: { log: () => {} },
    SpreadsheetApp: {
      getActive: () => ({
        getSheetByName: (n) => (n === 'Expenses' ? expenses : n === 'Budgets' ? budgets : null),
      }),
      flush: () => {},
    },
    Utilities: {
      getUuid: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      formatDate: (date, _tz, fmt) => {
        // The stub ignores the timezone: the assertions below use local-time
        // Date objects, exactly as the sheet hands them back.
        const y = date.getFullYear(), mo = pad(date.getMonth() + 1), day = pad(date.getDate());
        const h = pad(date.getHours()), mi = pad(date.getMinutes());
        if (fmt === 'yyyy-MM-dd') return `${y}-${mo}-${day}`;
        if (fmt === 'yyyy-MM') return `${y}-${mo}`;
        if (fmt === 'HH:mm') return `${h}:${mi}`;
        return `${y}-${mo}-${day} ${h}:${mi}`;
      },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k === 'SHARED_TOKEN' ? 'secret' : k === 'GEMINI_API_KEY' ? 'key' : null),
        setProperty: () => {},
      }),
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ setMimeType: () => s }),
    },
    HtmlService: { createHtmlOutput: () => ({ setTitle: () => ({ addMetaTag: () => {} }) }) },
    UrlFetchApp: { fetch: () => { throw new Error('the parser is not called in these tests'); } },
    ScriptApp: { getProjectTriggers: () => [] },
    GmailApp: {},
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return { ctx, expenses, budgets };
}

const BUDGETS = [
  ['Coffee', 3000, 'Lifestyle', 'cafes'],
  ['Food', 12000, 'Lifestyle', 'meals'],
  ['Travel', '', 'Fund', 'trips'],       // blank cap: tracked, never capped
  ['Others', 2000, 'Other', ''],
];

// Two rows written the way the back office writes them, and one whose Month
// cell Sheets has coerced into a Date.
const ROWS = () => [
  [d('2026-08-09'), t('2026-08-09', '21:37'), '2026-08', 'Buffer', 'Seven Eleven', 'Snacks',
    168, 'Cash', '', 'check', 'app', '', new Date(), '6a36594d'],
  [d('2026-08-10'), t('2026-08-10', '14:12'), d('2026-08-01'), 'Coffee', 'Pickup Coffee', 'Latte',
    105, 'GCash', '', '', 'shortcut', '', new Date(), '1aed59b4'],
  [d('2026-07-15'), '', '2026-07', 'Food', 'Yabu', 'Katsu',
    595, 'Visa 9956', '', '', 'gmail', '', new Date(), '34cf95f2'],
];

const post = (ctx, body) => {
  const raw = ctx.doPost({ postData: { contents: JSON.stringify(body) } });
  return JSON.parse(raw);
};

console.log('\nJarSar back office — handler checks\n');

check('list returns every column the app reads', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, { token: 'secret', action: 'list' });
  eq(out.ok, true, 'ok');
  eq(out.rows.length, 3, 'row count');
  const first = out.rows[0];
  eq(Object.keys(first).sort(), ['amount', 'category', 'date', 'id', 'item', 'month', 'notes',
    'paid_via', 'review', 'source', 'time', 'vendor'], 'keys');
  eq(first.date, '2026-08-09', 'date');
  eq(first.time, '21:37', 'time');
  eq(first.review, 'check', 'review');
});

check('a Month cell coerced to a Date still reads as its month', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, { token: 'secret', action: 'list' });
  eq(out.rows[1].month, '2026-08', 'coerced Month');
});

check('the month filter matches text and Date cells alike', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const aug = post(ctx, { token: 'secret', action: 'list', month: '2026-08' });
  eq(aug.rows.length, 2, 'August rows');
  const jul = post(ctx, { token: 'secret', action: 'list', month: '2026-07' });
  eq(jul.rows.length, 1, 'July rows');
});

check('a blank time reads as empty, not as a date', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, { token: 'secret', action: 'list', month: '2026-07' });
  eq(out.rows[0].time, '', 'time');
});

check('budgets reports a blank cap as null', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, { token: 'secret', action: 'budgets' });
  eq(out.budgets.length, 4, 'count');
  eq(out.budgets[0], { category: 'Coffee', monthly: 3000, group: 'Lifestyle' }, 'capped');
  eq(out.budgets[2], { category: 'Travel', monthly: null, group: 'Fund' }, 'uncapped');
});

check('update amends the fields it is given and leaves the rest alone', () => {
  const { ctx, expenses } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, {
    token: 'secret', action: 'update', id: '6a36594d',
    fields: { amount: 163, category: 'Buffer', notes: 'creased receipt' },
  });
  eq(out.ok, true, 'ok');
  eq(out.row.amount, 163, 'amount');
  eq(out.row.notes, 'creased receipt', 'notes');
  eq(out.row.vendor, 'Seven Eleven', 'vendor untouched');
  eq(expenses.data[1][10], 'app', 'source untouched');
  eq(expenses.data[1][13], '6a36594d', 'id untouched');
});

check('a human edit certifies the entry — the review flag clears', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, { token: 'secret', action: 'update', id: '6a36594d', fields: { amount: 163 } });
  eq(out.row.review, '', 'review cleared');
});

check('the flag can still be set deliberately', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, {
    token: 'secret', action: 'update', id: '1aed59b4', fields: { review: 'check' },
  });
  eq(out.row.review, 'check', 'review kept');
});

check('moving an entry to another month recomputes Month', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, {
    token: 'secret', action: 'update', id: '6a36594d', fields: { date: '2026-07-31' },
  });
  eq(out.row.date, '2026-07-31', 'date');
  eq(out.row.month, '2026-07', 'month recomputed');
  const jul = post(ctx, { token: 'secret', action: 'list', month: '2026-07' });
  eq(jul.rows.length, 2, 'the entry now lists under July');
});

check('moving the date carries the time onto the new day', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, {
    token: 'secret', action: 'update', id: '6a36594d', fields: { date: '2026-07-31' },
  });
  eq(out.row.time, '21:37', 'time preserved');
});

check('an empty time clears the cell', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  const out = post(ctx, { token: 'secret', action: 'update', id: '6a36594d', fields: { time: '' } });
  eq(out.row.time, '', 'time cleared');
});

check('nonsense values are refused rather than written', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  eq(post(ctx, { token: 'secret', action: 'update', id: '6a36594d', fields: { amount: -5 } }).ok,
    false, 'negative amount');
  eq(post(ctx, { token: 'secret', action: 'update', id: '6a36594d', fields: { date: '31-07-2026' } }).ok,
    false, 'malformed date');
  eq(post(ctx, { token: 'secret', action: 'update', id: '6a36594d', fields: { time: '25:00' } }).ok,
    false, 'impossible time');
  eq(post(ctx, { token: 'secret', action: 'list', month: 'August' }).ok, false, 'malformed month');
});

check('delete removes exactly one entry', () => {
  const { ctx, expenses } = buildContext(ROWS(), BUDGETS);
  const before = expenses.data.length;
  const out = post(ctx, { token: 'secret', action: 'delete', id: '1aed59b4' });
  eq(out.ok, true, 'ok');
  eq(expenses.data.length, before - 1, 'one row gone');
  eq(post(ctx, { token: 'secret', action: 'list' }).rows.some((r) => r.id === '1aed59b4'), false, 'gone');
});

check('an unknown id is an error, not a silent success', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  eq(post(ctx, { token: 'secret', action: 'update', id: 'nope', fields: {} }).ok, false, 'update');
  eq(post(ctx, { token: 'secret', action: 'delete', id: 'nope' }).ok, false, 'delete');
});

check('every action needs the credential', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  for (const action of ['list', 'budgets', 'update', 'delete']) {
    const out = post(ctx, { token: 'wrong', action, id: '6a36594d', fields: {} });
    eq(out.ok, false, `${action} rejected`);
  }
});

check('an unknown action is refused', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  eq(post(ctx, { token: 'secret', action: 'wipe' }).ok, false, 'refused');
});

// The regression that matters most: the Shortcut sends no action field, and
// its payload must still take the original logging path.
check('a body with no action still goes to the logger (Shortcut compatibility)', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  let reached = false;
  ctx.processExpense = () => { reached = true; return { ok: true, message: 'logged' }; };
  const out = post(ctx, { token: 'secret', text: 'coffee 105 gcash', source: 'shortcut' });
  eq(reached, true, 'processExpense called');
  eq(out.ok, true, 'ok');
});

check('action:"log" is the same path, spelled out', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  let reached = false;
  ctx.processExpense = () => { reached = true; return { ok: true, message: 'logged' }; };
  post(ctx, { token: 'secret', action: 'log', text: 'coffee 105' });
  eq(reached, true, 'processExpense called');
});

check('the watcher and console entry points are untouched', () => {
  const { ctx } = buildContext(ROWS(), BUDGETS);
  for (const fn of ['runGmailWatcher', 'setup', 'testWithText', 'doGet', 'api_logFromConsole',
    'processExpense', 'appendExpense', 'normalize', 'findDuplicate', 'requireToken']) {
    if (typeof ctx[fn] !== 'function') throw new Error(`${fn} is missing`);
  }
});

console.log(
  failures === 0
    ? '\nAll handler checks passed.\n'
    : `\n${failures} check(s) failed.\n`
);
process.exit(failures === 0 ? 0 : 1);
