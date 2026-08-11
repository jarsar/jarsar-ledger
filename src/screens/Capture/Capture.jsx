import { useMemo, useRef, useState } from 'react';
import Screen from '../../components/Screen';
import PillButton from '../../components/PillButton';
import Chip from '../../components/Chip';
import { AmountDisplay } from '../../components/Bits';
import { CameraIcon, CheckIcon } from '../../components/Icons';
import LogTerminal, { HonestBar } from './LogTerminal';
import { useLedger } from '../../state/LedgerContext';
import { shrinkToBase64 } from '../../lib/image';
import { buildMonthModel } from '../../lib/selectors';
import { pesoFlat, entryNo, monthLabel, dayLabel } from '../../lib/format';
import { COPY } from '../../lib/copy';
import { navigate, goBack } from '../../router';
import './Capture.css';

export default function Capture() {
  const { api, today, rowsOf, budgets, applyCapture } = useLedger();
  const [phase, setPhase] = useState('idle');
  const [typed, setTyped] = useState('');
  const [payload, setPayload] = useState(null); // held in memory only
  const [meta, setMeta] = useState({ bytes: 0, typed: false, startedAt: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const monthRows = rowsOf(today.month);

  // The change this filing made to its category's month, computed both ways.
  const delta = useMemo(() => {
    if (!result?.category) return null;
    const before = buildMonthModel(
      monthRows.filter((r) => r.id !== result.id),
      budgets,
      today
    ).byCategory.find((c) => c.category === result.category);
    const after = buildMonthModel(monthRows, budgets, today).byCategory.find(
      (c) => c.category === result.category
    );
    if (!before?.cap || !after?.cap) return null;
    return { category: result.category, from: Math.round(before.pct), to: Math.round(after.pct) };
  }, [result, monthRows, budgets, today]);

  const send = async (body, info) => {
    setPayload(body);
    setMeta({ ...info, startedAt: Date.now() });
    setResult(null);
    setError(null);
    setPhase('filing');
    try {
      const res = await api.capture(body);
      applyCapture(res);
      setResult(res);
      setPhase(res.review === 'check' ? 'review' : 'done');
    } catch (err) {
      setError(err);
      setPhase(err.kind === 'not-receipt' ? 'notreceipt' : 'failed');
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { base64, bytes } = await shrinkToBase64(file);
      await send({ image: base64, mimeType: 'image/jpeg' }, { bytes, typed: false });
    } catch (err) {
      setError(err);
      setPhase('failed');
    }
  };

  const onTyped = (e) => {
    e.preventDefault();
    const text = typed.trim();
    if (!text) return;
    send({ text }, { bytes: 0, typed: true });
  };

  const retry = () => payload && send(payload, meta);

  const heldLine = () => {
    if (meta.typed) return payload?.text || '';
    return result
      ? `${result.vendor} — ${result.item} ${pesoFlat(result.amount)} ${result.category}`
      : 'The captured image was not recorded.';
  };

  // ── idle ───────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <Screen variant="room" scroll={false}>
        <div className="cap">
          <header className="cap__head">
            <span className="cap__title">{COPY.capture.title}</span>
            <span className="mono cap__count">
              {monthRows.length} FILED · {monthLabel(today.month)}
            </span>
          </header>

          <button className="cap__stage" onClick={() => fileRef.current?.click()}>
            <span className="cap__guide">{COPY.capture.guide}</span>
            <span className="cap__shutter">
              <span className="cap__shutterinner" />
            </span>
          </button>

          <form className="cap__typed" onSubmit={onTyped}>
            <input
              className="mono cap__typedinput"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={COPY.capture.typedPlaceholder}
              autoCapitalize="off"
              autoCorrect="off"
            />
            {typed.trim() ? (
              <button type="submit" className="cap__file" aria-label="File this line">
                File
              </button>
            ) : (
              <span className="caret cap__caret" />
            )}
          </form>

          <p className="cap__footnote">{COPY.capture.footnote}</p>

          <div className="cap__dismiss">
            <PillButton variant="outline-light" size="sm" onClick={() => goBack('/')}>
              Close
            </PillButton>
          </div>
        </div>
        <input
          ref={fileRef}
          className="cap__input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
        />
      </Screen>
    );
  }

  // ── filing ─────────────────────────────────────────────────
  if (phase === 'filing') {
    return (
      <Screen variant="room" scroll={false}>
        <div className="cap">
          <header className="cap__head">
            <span className="cap__title">{COPY.capture.filing}</span>
            <span className="mono cap__filingno">FILING</span>
          </header>

          <div className="cap__skeleton">
            <div className="cap__skel">
              <span className="cap__skelbar" style={{ width: '60%', height: 6 }} />
              <span className="cap__skelbar" style={{ width: '85%' }} />
              <span className="cap__skelbar" style={{ width: '70%' }} />
              <span className="cap__skelbar" style={{ width: '78%' }} />
              <span className="cap__skelbar" style={{ width: '50%', marginTop: 6 }} />
              <span className="cap__scan" />
            </div>
          </div>

          <div className="cap__log">
            <LogTerminal startedAt={meta.startedAt} bytes={meta.bytes} typed={meta.typed} />
          </div>

          <div className="cap__progress">
            <HonestBar startedAt={meta.startedAt} />
          </div>
        </div>
      </Screen>
    );
  }

  // ── failed: the entry was not recorded ─────────────────────
  if (phase === 'failed') {
    return (
      <Screen variant="fog">
        <div className="cap__fail">
          <div className="cap__failbanner">
            <div className="mono cap__failstamp">
              {new Date().toTimeString().slice(0, 8)} ·{' '}
              {error?.kind === 'timeout' ? 'BACK OFFICE DID NOT ANSWER' : 'BACK OFFICE UNREACHABLE'}
            </div>
            <div className="cap__failtitle">
              Filing failed. This entry was <u>not recorded</u>.
            </div>
          </div>

          <div className="cap__failbody">
            <div className="cap__held">
              <div className="mono cap__heldlabel">{COPY.failure.held}</div>
              <div className="cap__heldline">{heldLine()}</div>
            </div>

            <p className="cap__failnote">{COPY.failure.body}</p>
            {error?.hint && <p className="cap__failhint">{error.hint}</p>}

            <PillButton variant="coral" size="lg" className="cap__failaction" onClick={retry}>
              {COPY.failure.resubmit}
            </PillButton>
            <PillButton
              variant="outline"
              size="md"
              className="cap__failaction"
              onClick={() => {
                navigator.clipboard?.writeText(heldLine());
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? COPY.failure.copied : COPY.failure.copy}
            </PillButton>
            <button className="cap__leave" onClick={() => goBack('/')}>
              Leave — the entry is lost
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // ── not a receipt ──────────────────────────────────────────
  if (phase === 'notreceipt') {
    return (
      <Screen variant="room" scroll={false}>
        <div className="cap cap--notreceipt">
          <div className="cap__rejectstage">
            <span className="cap__rejectframe">nothing legible in the frame</span>
          </div>
          <div className="cap__rejectcard">
            <div className="cap__rejecttitle">{COPY.notReceipt.title}</div>
            <p className="cap__rejectbody">{error?.message || COPY.notReceipt.body}</p>
            <div className="cap__rejectactions">
              <PillButton variant="teal" size="sm" onClick={() => fileRef.current?.click()}>
                {COPY.notReceipt.retake}
              </PillButton>
              <PillButton variant="outline" size="sm" onClick={() => setPhase('idle')}>
                {COPY.notReceipt.type}
              </PillButton>
            </div>
          </div>
        </div>
        <input
          ref={fileRef}
          className="cap__input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
        />
      </Screen>
    );
  }

  // ── sent to review ─────────────────────────────────────────
  if (phase === 'review') {
    return (
      <Screen variant="fog">
        <div className="cap__sent">
          <div className="cap__sentcard">
            <Chip text={COPY.review.sentChip} kind="amber" />
            <div className="cap__senttitle">{COPY.review.sentTitle}</div>
            <p className="cap__sentbody">{COPY.review.sentBody}</p>
            <div className="mono cap__senttable">
              <div>
                <span>VENDOR</span>
                <span>{(result.vendor || '—').toUpperCase()}</span>
              </div>
              <div>
                <span>AMOUNT</span>
                <span className="cap__sentflag">{pesoFlat(result.amount)} ?</span>
              </div>
              <div>
                <span>FILED</span>
                <span>{entryNo(result.id)}</span>
              </div>
            </div>
            <PillButton variant="teal" size="md" className="cap__sentaction" onClick={() => navigate('/review')}>
              {COPY.review.open}
            </PillButton>
          </div>
          <p className="cap__sentsafe">{COPY.review.safe}</p>
        </div>
      </Screen>
    );
  }

  // ── entered into record ────────────────────────────────────
  return (
    <Screen variant="room" scroll={false}>
      <div className="cap cap--done">
        <div className="cap__check">
          <CheckIcon />
        </div>
        <div className="cap__donetitle">{COPY.capture.done}</div>

        <div className="cap__receiptwrap">
          <div className="cap__receipt">
            <div className="cap__receipthead">
              <span className="mono cap__receiptno">
                {dayLabel(result.date)} · {result.time || '—'} · {entryNo(result.id)}
              </span>
              <Chip text={(result.category || '').toUpperCase()} kind="teal" />
            </div>
            <div className="cap__receiptvendor">{result.vendor}</div>
            <div className="cap__receiptitem">{result.item}</div>
            <AmountDisplay value={result.amount} size={34} className="cap__receiptamt" />
            <div className="cap__receiptfoot">
              <span className="mono">{(result.paid_via || 'UNSTATED').toUpperCase()} · VIA APP</span>
              <span className="mono cap__receiptclean">CLEAN</span>
            </div>
          </div>
          {delta && (
            <div className="mono cap__delta">
              {delta.category.toUpperCase()} {delta.from}% → {delta.to}%
            </div>
          )}
        </div>

        <div className="cap__donemsg">{result.message}</div>

        <div className="cap__doneactions">
          <PillButton variant="outline-light" grow={1} onClick={() => navigate(`/entry/${result.id}`)}>
            {COPY.capture.amend}
          </PillButton>
          <PillButton variant="white" grow={1.3} onClick={() => goBack('/')}>
            {COPY.capture.finish}
          </PillButton>
        </div>
      </div>
    </Screen>
  );
}
