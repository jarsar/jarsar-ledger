// Vendor monograms: two letters and a tint. The tint is a stable hash of the
// vendor name, so Pickup Coffee is always sage and GolfZon always mauve —
// recognisable down the list without ever being a legend.

const TINTS = ['sage', 'clay', 'mist', 'sand', 'mauve', 'rose'];

const OVERRIDES = {
  'pickup coffee': 'sage',
  yabu: 'clay',
  grab: 'mist',
  'seven eleven': 'sand',
  golfzon: 'mauve',
  jollibee: 'rose',
};

export function initials(vendor) {
  const clean = String(vendor || '').trim();
  if (!clean) return '—';
  const words = clean.split(/[\s\-&.]+/).filter(Boolean);
  if (words.length === 1) {
    const w = words[0];
    const digits = w.replace(/\D/g, '');
    if (digits.length >= 2 && /^\d/.test(w)) return (digits[0] + w.replace(/[^a-z]/gi, '')[0] || '').toUpperCase();
    return w.slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function tintOf(vendor) {
  const key = String(vendor || '').trim().toLowerCase();
  if (OVERRIDES[key]) return OVERRIDES[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function monogram(vendor) {
  const tint = tintOf(vendor);
  return {
    text: initials(vendor),
    tint,
    bg: `var(--tint-${tint}-bg)`,
    fg: `var(--tint-${tint}-fg)`,
  };
}
