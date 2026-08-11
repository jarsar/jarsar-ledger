/**
 * The 7c pace mark (design option 1a): two bars drawn at 68% and 34%, cut by
 * the amber tick at 38% — where the month says you should be. Every ratio
 * scales from the 110px master, so one component serves the icon, the
 * first-run tile, the header lockup and the empty state.
 */
export default function PaceMark({ size = 64, tile = true, glass = false }) {
  const s = size;
  const padX = 0.182 * s;
  const barH = Math.max(2, 0.091 * s);
  const gap = 0.155 * s;
  const tickW = Math.max(2, 0.041 * s);
  const tickOver = 0.073 * s;

  const bar = (fill) => (
    <div
      style={{
        position: 'relative',
        height: barH,
        borderRadius: 999,
        background: 'rgba(255,255,255,.25)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${fill}%`,
          borderRadius: 999,
          background: '#FFFFFF',
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: 0.236 * s,
        background: glass ? 'rgba(255,255,255,.1)' : tile ? 'linear-gradient(160deg,#1D3B42,#2E5A63)' : 'transparent',
        border: glass ? '1px solid rgba(255,255,255,.16)' : undefined,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${padX}px`,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'relative', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
          {bar(68)}
          {bar(34)}
        </div>
        <div
          style={{
            position: 'absolute',
            left: '38%',
            top: -tickOver,
            bottom: -tickOver,
            width: tickW,
            background: 'var(--amber)',
            borderRadius: tickW / 2,
          }}
        />
      </div>
    </div>
  );
}
