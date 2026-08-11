import { monthLabel } from '../../lib/format';

const HATCH = 'repeating-linear-gradient(45deg,#264B53 0 3px,rgba(38,75,83,.15) 3px 6px)';

/** Six months side by side. The open month is hatched — it isn't finished. */
export default function TrendBars({ series }) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          height: 74,
          marginTop: 12,
          borderBottom: '1px solid rgba(20,37,42,.12)',
          padding: '0 2px',
        }}
      >
        {series.map((t) => (
          <div
            key={t.month}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              gap: 4,
            }}
          >
            <div className="mono" style={{ flex: 'none', fontSize: 8, color: 'rgba(20,37,42,.5)' }}>
              {t.known ? (t.total / 1000).toFixed(1) : '—'}
            </div>
            {/* The bar is a percentage of this track, not of the column —
                otherwise the value label steals the height and every month
                ends up looking the same. */}
            <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: 0 }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '5px 5px 0 0',
                  height: `${Math.max(t.heightPct, t.known ? 4 : 0)}%`,
                  background: t.current ? HATCH : 'var(--teal)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 5, padding: '0 2px' }}>
        {series.map((t) => (
          <div
            key={t.month}
            className="mono"
            style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'rgba(20,37,42,.45)' }}
          >
            {monthLabel(t.month)}
          </div>
        ))}
      </div>
    </>
  );
}
