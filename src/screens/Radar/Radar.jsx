import { useMemo, useState } from 'react';
import Screen, { ScreenBody, ScreenTop } from '../../components/Screen';
import { FilterChip, StatusDot } from '../../components/Bits';
import { useLedger } from '../../state/LedgerContext';
import { buildMonthModel } from '../../lib/selectors';
import { radarSignals } from '../../lib/radar';
import { COPY } from '../../lib/copy';
import { navigate } from '../../router';
import './Radar.css';

const TONE = { flag: 'coral', advisory: 'amber', notice: 'mint' };

export default function Radar() {
  const { today, budgets, rowsOf, allRows, dismissed, dismiss, connection } = useLedger();
  const [filter, setFilter] = useState('all');

  const model = useMemo(
    () => buildMonthModel(rowsOf(today.month), budgets, today, today.month, rowsOf(shiftBack(today.month))),
    [rowsOf, budgets, today]
  );

  const signals = useMemo(() => {
    const history = allRows.filter((r) => r.month < today.month);
    return radarSignals(model, history, today, dismissed);
  }, [model, allRows, today, dismissed]);

  const flags = signals.filter((s) => s.severity === 'flag').length;
  const shown = signals.filter((s) => {
    if (filter === 'flags') return s.severity === 'flag';
    if (filter === 'notices') return s.severity === 'notice';
    return true;
  });

  const pass = connection.lastOkAt
    ? new Date(connection.lastOkAt).toTimeString().slice(0, 5)
    : today.time;

  return (
    <Screen variant="room" scroll={false}>
      <ScreenTop tone="plain" className="radar__top">
        <div className="radar__titlerow">
          <div className="radar__title">
            <StatusDot tone="amber" pulse size={8} />
            <span className="radar__heading">{COPY.radar.title}</span>
          </div>
          <span className="mono radar__pass">PASS {pass}</span>
        </div>
        <div className="radar__filters">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterChip>
          <FilterChip
            tone={flags ? 'coral' : 'plain'}
            active={filter === 'flags'}
            onClick={() => setFilter(filter === 'flags' ? 'all' : 'flags')}
          >
            Flags · {flags}
          </FilterChip>
          <FilterChip active={filter === 'notices'} onClick={() => setFilter(filter === 'notices' ? 'all' : 'notices')}>
            Notices
          </FilterChip>
        </div>
      </ScreenTop>

      <ScreenBody dock className="radar__body">
        {shown.map((s) => (
          <SignalCard key={s.key} signal={s} model={model} onDismiss={() => dismiss(s.key)} />
        ))}
        {shown.length === 0 ? (
          <div className="mono radar__quietalone">{COPY.radar.quietAlone}</div>
        ) : (
          <div className="mono radar__quiet">{COPY.radar.quiet}</div>
        )}
      </ScreenBody>
    </Screen>
  );
}

function SignalCard({ signal, model, onDismiss }) {
  const tone = TONE[signal.severity];
  return (
    <article className="signal">
      <div className="signal__head">
        <span className="signal__label">
          <StatusDot tone={signal.severity === 'notice' ? 'mint' : tone} size={7} />
          <span className={`mono signal__labeltext signal__labeltext--${tone}`}>{signal.label}</span>
        </span>
        <span className="mono signal__at">{signal.at}</span>
      </div>

      <div className="signal__title">{signal.title}</div>
      <p className="signal__body">{signal.body}</p>

      {signal.spark?.type === 'pace' && <PaceSpark model={model} category={signal.category} />}
      {signal.spark?.type === 'bars' && <BarSpark bars={signal.spark.bars} />}

      <div className="signal__actions">
        <button className="signal__view" onClick={() => navigate(signal.action.href)}>
          {signal.action.label}
        </button>
        <button className="signal__dismiss" onClick={onDismiss}>
          {COPY.radar.dismiss}
        </button>
      </div>
    </article>
  );
}

/** The category's own line against its own dashed pace. */
function PaceSpark({ model, category }) {
  const cat = model.byCategory.find((c) => c.category === category);
  if (!cat?.cap) return null;

  const W = 320;
  const H = 32;
  const byDay = new Map();
  for (const r of cat.entries) {
    const d = Number(String(r.date).slice(8, 10));
    byDay.set(d, (byDay.get(d) || 0) + (Number(r.amount) || 0));
  }
  const pts = [];
  let running = 0;
  for (let d = 1; d <= model.day; d++) {
    running += byDay.get(d) || 0;
    pts.push(`${((W * d) / model.daysInMonth).toFixed(1)},${(H - 4 - (H - 8) * Math.min(running / cat.cap, 1)).toFixed(1)}`);
  }

  return (
    <svg width="100%" height="32" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="signal__spark">
      <polyline
        points={`0,${H - 4} ${W},4`}
        fill="none"
        stroke="rgba(20,37,42,.25)"
        strokeWidth="1"
        strokeDasharray="2 5"
      />
      <polyline points={pts.join(' ')} fill="none" stroke="var(--coral)" strokeWidth="2" />
    </svg>
  );
}

function BarSpark({ bars }) {
  const max = Math.max(...bars, 1);
  return (
    <div className="signal__bars">
      {bars.map((n, i) => (
        <div
          key={i}
          className={`signal__bar${i === bars.length - 1 ? ' signal__bar--now' : ''}`}
          style={{ height: `${Math.max((n / max) * 100, 8)}%` }}
        />
      ))}
    </div>
  );
}

function shiftBack(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
