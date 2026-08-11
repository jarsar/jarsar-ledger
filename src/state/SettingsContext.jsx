import { createContext, useContext, useMemo, useState, useCallback } from 'react';

// The credential lives on this device and nowhere else — it is never
// committed, never sent anywhere but the back office, never logged.
const KEYS = {
  url: 'jarsar_url',
  token: 'jarsar_token',
  demo: 'jarsar_demo',
  book: 'jarsar_book_url',
};

const read = (k, fallback = '') => {
  try {
    return localStorage.getItem(k) ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (k, v) => {
  try {
    if (v == null || v === '') localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* private mode: the session still works, it just won't be remembered */
  }
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [state, setState] = useState(() => ({
    url: read(KEYS.url),
    token: read(KEYS.token),
    demo: read(KEYS.demo) === '1',
    book: read(KEYS.book),
  }));

  const connect = useCallback((url, token) => {
    write(KEYS.url, url);
    write(KEYS.token, token);
    write(KEYS.demo, '');
    setState((s) => ({ ...s, url, token, demo: false }));
  }, []);

  const enterDemo = useCallback(() => {
    write(KEYS.demo, '1');
    setState((s) => ({ ...s, demo: true }));
  }, []);

  const leaveDemo = useCallback(() => {
    write(KEYS.demo, '');
    setState((s) => ({ ...s, demo: false }));
  }, []);

  const setBook = useCallback((url) => {
    write(KEYS.book, url);
    setState((s) => ({ ...s, book: url }));
  }, []);

  /** Revoke: the device forgets everything it was told. */
  const revoke = useCallback(() => {
    Object.values(KEYS).forEach((k) => write(k, ''));
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('jarsar_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    setState({ url: '', token: '', demo: false, book: '' });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      connected: state.demo || Boolean(state.url && state.token),
      connect,
      enterDemo,
      leaveDemo,
      setBook,
      revoke,
    }),
    [state, connect, enterDemo, leaveDemo, setBook, revoke]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}
