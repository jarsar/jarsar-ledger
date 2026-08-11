import { peso } from '../lib/format';
import PaceMark from './PaceMark';
import './Bits.css';

/** The hero figure: decimals at half size and 45% ink, always DM Mono. */
export function AmountDisplay({ value, size = 34, className = '', tone }) {
  const { int, dec } = peso(value);
  return (
    <span className={`mono amount ${className}`} style={{ fontSize: size, color: tone }}>
      ₱{int}
      <span className="amount__dec" style={{ fontSize: size * 0.5 }}>
        {dec}
      </span>
    </span>
  );
}

/** A letterspaced mono rubric — the product's section voice. */
export function SectionLabel({ children, className = '', tone }) {
  return (
    <div className={`seclabel mono ${className}`} style={{ color: tone }}>
      {children}
    </div>
  );
}

export function StatusDot({ tone = 'mint', pulse = false, size = 7, hollow = false }) {
  const colors = { mint: 'var(--mint-text)', amber: 'var(--amber)', coral: 'var(--coral)', room: 'var(--mint)' };
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: hollow ? 'transparent' : colors[tone] || tone,
        border: hollow ? '1.5px solid rgba(20,37,42,.3)' : undefined,
        animation: pulse ? 'pulseDot 3s infinite' : undefined,
      }}
    />
  );
}

/** The JUL ⇄ AUG toggle — two months, never more. */
export function SegmentedToggle({ options, value, onChange }) {
  return (
    <div className="segmented chrome">
      {options.map((o) => (
        <button
          key={o.value}
          className={`segmented__opt mono${o.value === value ? ' segmented__opt--on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A filter chip row — Activity's All / Review / Cash, Radar's severities. */
export function FilterChip({ children, active = false, tone = 'plain', onClick }) {
  return (
    <button className={`fchip fchip--${tone}${active ? ' fchip--on' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function EmptyState({ title, body, tag, mark = 64, children }) {
  return (
    <div className="empty">
      {mark ? <PaceMark size={mark} /> : null}
      <div className="empty__title">{title}</div>
      {body && <p className="empty__body">{body}</p>}
      {tag && <div className="empty__tag mono">{tag}</div>}
      {children}
    </div>
  );
}
