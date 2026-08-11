/**
 * A category's draw against its cap, cut by the amber tick at
 * day ÷ days-in-month — where the month says you should be.
 * Closed months hide the tick: there is no "should be" left to mark.
 */
export default function PaceBar({ pct = 0, color = 'var(--teal)', tickPct = null }) {
  return (
    <div
      style={{
        position: 'relative',
        height: 'var(--bar-h)',
        background: 'rgba(20,37,42,.08)',
        borderRadius: 999,
        marginTop: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          borderRadius: 999,
          background: color,
          width: `${Math.max(0, Math.min(pct, 100))}%`,
        }}
      />
      {tickPct !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.max(0, Math.min(tickPct, 100))}%`,
            top: -4,
            width: 'var(--tick-w)',
            height: 'var(--tick-h)',
            background: 'var(--amber)',
            borderRadius: 2,
          }}
        />
      )}
    </div>
  );
}
