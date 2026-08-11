// Money, dates and serials. The book keeps Manila time regardless of where
// the phone thinks it is.

export const TZ = 'Asia/Manila';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const partsIn = (date) => {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const out = {};
  for (const p of f.formatToParts(date)) out[p.type] = p.value;
  return out;
};

/** The book's "today" — day, month and length, all in Manila. */
export function manilaToday(now = new Date()) {
  const p = partsIn(now);
  const year = Number(p.year);
  const month = Number(p.month);
  const day = Number(p.day);
  return {
    iso: `${p.year}-${p.month}-${p.day}`,
    month: `${p.year}-${p.month}`,
    year,
    monthIndex: month - 1,
    day,
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
    time: `${p.hour}:${p.minute}`,
  };
}

export function daysInMonthOf(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 'yyyy-MM' → 'AUG' */
export function monthLabel(monthStr) {
  const m = Number(String(monthStr).split('-')[1]);
  return MONTHS[m - 1] || '';
}

/** 'yyyy-MM' → 'August' */
export function monthName(monthStr) {
  const m = Number(String(monthStr).split('-')[1]);
  const long = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  return long[m - 1] || '';
}

/** 'yyyy-MM-dd' → '10 AUG' */
export function dayLabel(iso) {
  if (!iso) return '';
  const [, m, d] = String(iso).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] || ''}`;
}

/** 'yyyy-MM-dd' → 'AUG 10' — the SETTLED chip's form. */
export function monthDayLabel(iso) {
  if (!iso) return '';
  const [, m, d] = String(iso).split('-');
  return `${MONTHS[Number(m) - 1] || ''} ${Number(d)}`;
}

export function shiftMonth(monthStr, delta) {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthOf(iso) {
  return String(iso || '').slice(0, 7);
}

/** Days between two ISO dates (b − a). */
export function daysBetween(aIso, bIso) {
  const a = Date.parse(`${aIso}T00:00:00Z`);
  const b = Date.parse(`${bIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

export function addDays(iso, n) {
  const t = Date.parse(`${iso}T00:00:00Z`) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Day D of the given month as an ISO date. */
export function isoOfDay(monthStr, day) {
  return `${monthStr}-${String(day).padStart(2, '0')}`;
}

const grouped = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Splits an amount for display: the integer part carries full weight, the
 * decimals are rendered half-size at 45% ink.
 */
export function peso(amount) {
  const n = Number(amount) || 0;
  const neg = n < 0;
  // Round to centavos first: summing floats can leave 74195.999999, whose
  // fractional part rounds to 100 and prints as ".100".
  const cents = Math.round(Math.abs(n) * 100);
  const int = Math.floor(cents / 100);
  const dec = cents % 100;
  return {
    int: `${neg ? '−' : ''}${grouped(int)}`,
    dec: `.${String(dec).padStart(2, '0')}`,
  };
}

/** '₱1,234.50' — one flat string, for chips and lines. */
export function pesoFlat(amount, { symbol = true } = {}) {
  const n = Number(amount) || 0;
  const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '−' : ''}${symbol ? '₱' : ''}${s}`;
}

/** '₱57.8K' — the chart bubble and header tallies. */
export function pesoK(amount) {
  const n = Number(amount) || 0;
  return `₱${(n / 1000).toFixed(1)}K`;
}

/** Whole pesos, no decimals — budget caps and radar prose. */
export function pesoRound(amount) {
  return `₱${grouped(Math.round(Number(amount) || 0))}`;
}

/**
 * The display serial. Real IDs are 8 hex characters; the book shows the
 * first four, uppercased. Never an address — the API always takes the full id.
 */
export function entryNo(id) {
  const s = String(id || '').replace(/[^a-z0-9]/gi, '');
  return s ? `№ ${s.slice(0, 4).toUpperCase()}` : '№ —';
}

export function pct(n, digits = 0) {
  return `${(Number(n) || 0).toFixed(digits)}%`;
}
