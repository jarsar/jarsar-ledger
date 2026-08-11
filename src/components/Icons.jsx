// Inline SVG only — no icon font, no sprite sheet.

export const HomeIcon = ({ active }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <rect
      x="2"
      y="2"
      width="14"
      height="14"
      rx="4.5"
      fill="none"
      stroke={active ? 'var(--teal)' : 'rgba(20,37,42,.4)'}
      strokeWidth="1.8"
    />
  </svg>
);

export const ActivityIcon = ({ active }) => {
  const c = active ? 'var(--teal)' : 'rgba(20,37,42,.4)';
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="4" width="14" height="2" rx="1" fill={c} />
      <rect x="2" y="9" width="10" height="2" rx="1" fill={c} />
      <rect x="2" y="14" width="13" height="2" rx="1" fill={c} />
    </svg>
  );
};

export const RadarIcon = ({ active }) => {
  const c = active ? 'var(--teal)' : 'rgba(20,37,42,.4)';
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="none" stroke={c} strokeWidth="1.8" />
      <circle cx="9" cy="9" r="2.2" fill={c} />
    </svg>
  );
};

export const MoreIcon = ({ active }) => {
  const c = active ? 'var(--teal)' : 'rgba(20,37,42,.4)';
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="4" cy="9" r="1.6" fill={c} />
      <circle cx="9" cy="9" r="1.6" fill={c} />
      <circle cx="14" cy="9" r="1.6" fill={c} />
    </svg>
  );
};

export const SearchIcon = ({ color = 'rgba(242,247,245,.7)' }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="5" fill="none" stroke={color} strokeWidth="1.6" />
    <rect x="10" y="10" width="4.5" height="1.7" rx=".85" transform="rotate(45 10 10)" fill={color} />
  </svg>
);

export const CheckIcon = ({ color = 'var(--mint)', size = 16 }) => (
  <svg width={size} height={size * 0.75} viewBox="0 0 16 12" aria-hidden="true">
    <polyline
      points="1.5,6 6,10.5 14.5,1.5"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronLeft = ({ color = 'var(--teal)' }) => (
  <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden="true">
    <path
      d="M7 1L1 7l6 6"
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CameraIcon = ({ color = '#FFFFFF', size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3.4" fill="none" stroke={color} strokeWidth="1.6" />
  </svg>
);
