import { useEffect, useState } from 'react';

// Eight flat routes, depth never beyond one back. Hash routing needs no 404
// fallback on GitHub Pages and survives a standalone relaunch, which always
// lands on index.html.

const STATIONS = ['home', 'activity', 'radar', 'more'];

export function parseHash(hash) {
  const raw = (hash || '').replace(/^#/, '') || '/';
  const [path, search] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = {};
  if (search) {
    for (const pair of search.split('&')) {
      const [k, v] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }
  const name = parts[0] || 'home';
  return { name, param: parts[1] ? decodeURIComponent(parts[1]) : null, query };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path, { replace = false } = {}) {
  const hash = path.startsWith('#') ? path : `#${path}`;
  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function goBack(fallback = '/') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}

export function isStation(name) {
  return STATIONS.includes(name);
}
