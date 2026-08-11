import { monogram } from '../lib/monogram';

export default function Monogram({ vendor, size = 40, radius }) {
  const m = monogram(vendor);
  return (
    <div
      className="mono"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? (size >= 44 ? 14 : 13),
        background: m.bg,
        color: m.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size >= 44 ? 13 : 12,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {m.text}
    </div>
  );
}
