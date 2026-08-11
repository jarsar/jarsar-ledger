import { useEffect, useRef, useState } from 'react';
import { pesoFlat } from '../../lib/format';
import { COPY } from '../../lib/copy';
import { formatBytes } from '../../lib/image';

/**
 * The filing log. Every line is a fact the client actually knows:
 * what was sent, how long it has been waiting, and what came back. The
 * back office reports no intermediate progress, so none is invented — the
 * waiting line simply counts, and the result lines appear only on arrival.
 */
export default function LogTerminal({ startedAt, bytes, typed, result, error }) {
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 100);
    return () => clearInterval(timer.current);
  }, [startedAt]);

  useEffect(() => {
    if (!result) return;
    clearInterval(timer.current);
    setRevealed(0);
    const timers = [1, 2, 3].map((i) => setTimeout(() => setRevealed(i), i * 300));
    return () => timers.forEach(clearTimeout);
  }, [result]);

  const stamp = (offset = 0) => {
    const t = new Date(startedAt + offset * 1000);
    return t.toTimeString().slice(0, 8);
  };

  return (
    <div className="mono log">
      <div className="log__line">
        <span className="log__time">{stamp(0)}</span> instrument received{' '}
        <span className="log__dim">({typed ? 'typed line' : formatBytes(bytes)})</span>
      </div>
      <div className="log__line">
        <span className="log__time">{stamp(0)}</span> posting to the back office
      </div>

      {!result && !error && (
        <div className="log__line">
          <span className="log__time">{stamp(elapsed)}</span> waiting on the parser ·{' '}
          <span className="log__amber">{elapsed.toFixed(1)}s</span>
        </div>
      )}

      {error && (
        <div className="log__line log__line--bad">
          <span className="log__time">{stamp(elapsed)}</span> {error}
        </div>
      )}

      {result && (
        <>
          <div className="log__line">
            <span className="log__time">{stamp(elapsed)}</span> parsed in{' '}
            <span className="log__mint">{elapsed.toFixed(1)}s</span>
          </div>
          {revealed >= 1 && (
            <div className="log__line">
              <span className="log__time">{stamp(elapsed)}</span> vendor:{' '}
              <span className="log__strong">{result.vendor || '—'}</span>
            </div>
          )}
          {revealed >= 2 && (
            <div className="log__line">
              <span className="log__time">{stamp(elapsed)}</span> amount:{' '}
              <span className="log__strong">{pesoFlat(result.amount)}</span> · {result.category}
              {result.paid_via ? ` · ${result.paid_via.toUpperCase()}` : ''}
            </div>
          )}
          {revealed >= 3 && (
            <div className="log__line">
              <span className="log__time">{stamp(elapsed)}</span>{' '}
              <span className="log__amber log__closing">
                {result.review === 'check' ? 'docketed for review — not yet certified.' : COPY.capture.entered}
              </span>
            </div>
          )}
        </>
      )}

      {!result && !error && <span className="log__caret" />}
    </div>
  );
}

/**
 * The hairline advances with real elapsed time toward — never past — 82%,
 * and only completes when the back office has actually answered. A fast
 * parse finishes early; a slow one visibly waits. It never fakes progress.
 */
export function HonestBar({ startedAt, done, failed, expected = 8000 }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (done || failed) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(t);
  }, [startedAt, done, failed]);

  const width = done ? 100 : Math.min(82, 3 + (elapsed / expected) * 79);

  return (
    <div className="cap__progressbar">
      <div
        className="cap__progressfill"
        style={{ width: `${width}%`, opacity: failed ? 0.4 : 1 }}
      />
    </div>
  );
}
