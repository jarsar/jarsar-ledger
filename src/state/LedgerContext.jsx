import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAdapter } from '../api';
import { cache } from './cache';
import { useSettings } from './SettingsContext';
import { manilaToday, shiftMonth } from '../lib/format';

const LedgerContext = createContext(null);

const TREND_MONTHS = 6;
const STALE_MS = 60_000;

export function LedgerProvider({ children }) {
  const settings = useSettings();
  const demo = settings.demo;

  const api = useMemo(
    () => getAdapter({ demo, url: settings.url, token: settings.token }),
    [demo, settings.url, settings.token]
  );

  const today = useMemo(() => manilaToday(api.now()), [api]);

  const [months, setMonths] = useState(() => {
    const seed = {};
    const cached = cache.readMonth(demo, manilaToday().month);
    if (cached) seed[manilaToday().month] = { rows: cached.rows, fetchedAt: cached.fetchedAt, status: 'ready' };
    return seed;
  });
  const [budgets, setBudgets] = useState(() => cache.readBudgets(demo)?.budgets || []);
  const [selectedMonth, setSelectedMonth] = useState(today.month);
  const [dismissed, setDismissed] = useState(() => cache.readDismissed(demo));
  const [pending, setPending] = useState({});
  const [connection, setConnection] = useState({ lastOkAt: null, error: null, checking: false });
  const [loading, setLoading] = useState(false);

  const inflight = useRef(new Set());

  const fetchMonth = useCallback(
    async (month, { force = false } = {}) => {
      if (!settings.connected) return;
      const have = months[month];
      const fresh = have?.fetchedAt && Date.now() - have.fetchedAt < STALE_MS;
      const closed = month < today.month;
      if (!force && (inflight.current.has(month) || (have?.rows && (closed || fresh)))) return;

      inflight.current.add(month);
      if (!have?.rows) setLoading(true);
      try {
        const rows = await api.list(month);
        cache.writeMonth(demo, month, rows);
        setMonths((m) => ({ ...m, [month]: { rows, fetchedAt: Date.now(), status: 'ready' } }));
        setConnection({ lastOkAt: Date.now(), error: null, checking: false });
      } catch (err) {
        setMonths((m) => ({ ...m, [month]: { ...(m[month] || {}), status: 'error', error: err } }));
        setConnection((c) => ({ ...c, error: err, checking: false }));
      } finally {
        inflight.current.delete(month);
        setLoading(false);
      }
    },
    [api, demo, months, settings.connected, today.month]
  );

  const fetchBudgets = useCallback(async () => {
    if (!settings.connected) return;
    try {
      const list = await api.budgets();
      cache.writeBudgets(demo, list);
      setBudgets(list);
      setConnection({ lastOkAt: Date.now(), error: null, checking: false });
    } catch (err) {
      setConnection((c) => ({ ...c, error: err, checking: false }));
    }
  }, [api, demo, settings.connected]);

  // On open: the current month, the budgets, and — quietly, behind them —
  // the five months the trend card needs.
  useEffect(() => {
    if (!settings.connected) return;
    const seed = cache.readMonth(demo, today.month);
    if (seed) setMonths((m) => ({ ...m, [today.month]: { ...seed, status: 'ready' } }));
    fetchBudgets();
    fetchMonth(today.month, { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.connected, demo]);

  useEffect(() => {
    if (!settings.connected) return;
    let cancelled = false;
    (async () => {
      for (let i = 1; i < TREND_MONTHS; i++) {
        if (cancelled) return;
        const m = shiftMonth(today.month, -i);
        const cached = cache.readMonth(demo, m);
        if (cached) {
          setMonths((prev) => (prev[m] ? prev : { ...prev, [m]: { ...cached, status: 'ready' } }));
          continue;
        }
        try {
          const rows = await api.list(m);
          if (cancelled) return;
          cache.writeMonth(demo, m, rows);
          setMonths((prev) => ({ ...prev, [m]: { rows, fetchedAt: Date.now(), status: 'ready' } }));
        } catch {
          /* a missing month is a gap in the trend, not an error worth shouting */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.connected, demo, today.month]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMonth(today.month);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchMonth, today.month]);

  const rowsOf = useCallback((month) => months[month]?.rows || [], [months]);

  const allRows = useMemo(() => Object.values(months).flatMap((m) => m.rows || []), [months]);

  const monthTotals = useMemo(() => {
    const out = {};
    for (const [m, entry] of Object.entries(months)) {
      if (entry.rows) out[m] = entry.rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    }
    return out;
  }, [months]);

  /** Writes wait for the book to answer — a stamp that might un-stamp is a lie. */
  const updateRow = useCallback(
    async (id, fields) => {
      setPending((p) => ({ ...p, [id]: 'updating' }));
      try {
        const row = await api.update(id, fields);
        setMonths((m) => {
          const next = { ...m };
          for (const [month, entry] of Object.entries(next)) {
            if (!entry.rows) continue;
            const i = entry.rows.findIndex((r) => r.id === id);
            if (i === -1) continue;
            const rows = [...entry.rows];
            if (row.month && row.month !== month) rows.splice(i, 1);
            else rows[i] = row;
            next[month] = { ...entry, rows };
            cache.writeMonth(demo, month, rows);
          }
          if (row.month && !next[row.month]?.rows?.some((r) => r.id === id)) {
            const entry = next[row.month];
            if (entry?.rows) {
              const rows = [...entry.rows, row];
              next[row.month] = { ...entry, rows };
              cache.writeMonth(demo, row.month, rows);
            }
          }
          return next;
        });
        return row;
      } finally {
        setPending((p) => {
          const { [id]: _drop, ...rest } = p;
          return rest;
        });
      }
    },
    [api, demo]
  );

  const removeRow = useCallback(
    async (id) => {
      setPending((p) => ({ ...p, [id]: 'deleting' }));
      try {
        await api.remove(id);
        setMonths((m) => {
          const next = { ...m };
          for (const [month, entry] of Object.entries(next)) {
            if (!entry.rows?.some((r) => r.id === id)) continue;
            const rows = entry.rows.filter((r) => r.id !== id);
            next[month] = { ...entry, rows };
            cache.writeMonth(demo, month, rows);
          }
          return next;
        });
      } finally {
        setPending((p) => {
          const { [id]: _drop, ...rest } = p;
          return rest;
        });
      }
    },
    [api, demo]
  );

  /** A capture's answer is the book's own word, so it lands straight away. */
  const applyCapture = useCallback(
    (result) => {
      if (!result?.id) return;
      const month = String(result.date || '').slice(0, 7);
      const row = {
        id: result.id,
        date: result.date,
        time: result.time || '',
        month,
        category: result.category,
        vendor: result.vendor,
        item: result.item,
        amount: Number(result.amount) || 0,
        paid_via: result.paid_via || '',
        notes: '',
        review: result.review || '',
        source: 'app',
      };
      setMonths((m) => {
        const entry = m[month];
        if (!entry?.rows) return m;
        if (entry.rows.some((r) => r.id === row.id)) return m;
        const rows = [...entry.rows, row];
        cache.writeMonth(demo, month, rows);
        return { ...m, [month]: { ...entry, rows } };
      });
      setTimeout(() => fetchMonth(month, { force: true }), 2000);
      return row;
    },
    [demo, fetchMonth]
  );

  const dismiss = useCallback(
    (key) => {
      setDismissed((d) => {
        const next = { ...d, [key]: today.iso };
        cache.writeDismissed(demo, next);
        return next;
      });
    },
    [demo, today.iso]
  );

  const checkConnection = useCallback(async () => {
    setConnection((c) => ({ ...c, checking: true }));
    try {
      await api.ping();
      setConnection({ lastOkAt: Date.now(), error: null, checking: false });
      return true;
    } catch (err) {
      setConnection((c) => ({ ...c, error: err, checking: false }));
      return false;
    }
  }, [api]);

  /** The escape hatch for rows edited by hand in the sheet. */
  const resync = useCallback(async () => {
    cache.clear(demo);
    setMonths({});
    setBudgets([]);
    await fetchBudgets();
    await fetchMonth(today.month, { force: true });
  }, [demo, fetchBudgets, fetchMonth, today.month]);

  const value = useMemo(
    () => ({
      api,
      today,
      budgets,
      months,
      rowsOf,
      allRows,
      monthTotals,
      selectedMonth,
      setSelectedMonth,
      fetchMonth,
      fetchBudgets,
      updateRow,
      removeRow,
      applyCapture,
      pending,
      dismissed,
      dismiss,
      connection,
      checkConnection,
      resync,
      loading,
    }),
    [
      api, today, budgets, months, rowsOf, allRows, monthTotals, selectedMonth, fetchMonth,
      fetchBudgets, updateRow, removeRow, applyCapture, pending, dismissed, dismiss,
      connection, checkConnection, resync, loading,
    ]
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error('useLedger outside LedgerProvider');
  return ctx;
}
