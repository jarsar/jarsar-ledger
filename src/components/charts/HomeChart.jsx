import { pesoK } from '../../lib/format';

/**
 * The month in one line: cumulative spend in white against the amber dashed
 * diagonal, which is what "on budget by month end" looks like. The bubble
 * sits over the dot without ever leaving the frame.
 */
export default function HomeChart({ series, closed }) {
  const { points, dot, pace } = series;
  const bubble = closed ? `CLOSED ${pesoK(series.total)}` : `TODAY ${pesoK(series.total)}`;

  // The bubble is ~112px wide; keep it inside the 402-wide frame.
  const left = Math.max(12, Math.min(dot.x + 18, 402 - 124));

  return (
    <div style={{ position: 'relative', marginTop: 4 }}>
      <svg width="100%" height="130" viewBox="0 0 402 130" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={`${pace.x1},${pace.y1} ${pace.x2},${pace.y2}`}
          fill="none"
          stroke="var(--amber)"
          strokeWidth="2"
          strokeDasharray="2 8"
          strokeLinecap="round"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={dot.x} cy={dot.y} r="5.5" fill="var(--amber)" />
        <circle cx={dot.x} cy={dot.y} r="2.2" fill="var(--ink)" />
      </svg>
      <div
        className="mono"
        style={{
          position: 'absolute',
          left: `${(left / 402) * 100}%`,
          top: 16,
          background: 'var(--amber)',
          color: 'var(--ink)',
          borderRadius: 9,
          padding: '6px 10px',
          fontSize: 10.5,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {bubble}
      </div>
    </div>
  );
}
