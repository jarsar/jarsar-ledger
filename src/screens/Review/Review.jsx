import { useMemo, useState } from 'react';
import Screen, { ScreenBody } from '../../components/Screen';
import Monogram from '../../components/Monogram';
import PillButton from '../../components/PillButton';
import { EmptyState } from '../../components/Bits';
import { ChevronLeft } from '../../components/Icons';
import { useLedger } from '../../state/LedgerContext';
import { docketOf } from '../../lib/selectors';
import { pesoFlat, dayLabel, entryNo } from '../../lib/format';
import { COPY } from '../../lib/copy';
import { navigate, goBack } from '../../router';
import './Review.css';

export default function Review() {
  const { allRows, budgets, updateRow, removeRow, pending } = useLedger();
  const [certified, setCertified] = useState({});

  const docket = useMemo(() => docketOf(allRows), [allRows]);
  const waiting = docket.length;

  // A card that has just been certified stays in place, stamped, for the rest
  // of the sweep — the sweep should not shuffle under the thumb.
  const cards = useMemo(() => {
    const seen = new Set(docket.map((d) => d.id));
    const done = Object.values(certified).filter((c) => !seen.has(c.id));
    return [...docket, ...done];
  }, [docket, certified]);

  return (
    <Screen variant="fog" scroll={false}>
      <div className="review__head">
        <button className="review__back" onClick={() => goBack('/activity')}>
          <ChevronLeft />
          <span>Back</span>
        </button>
        <div className="review__titlerow">
          <span className="review__title">{COPY.review.title}</span>
          <span className="mono review__waiting">{waiting} WAITING</span>
        </div>
        <p className="review__lede">{COPY.review.lede}</p>
      </div>

      <ScreenBody className="review__body">
        {cards.length === 0 ? (
          <EmptyState title={COPY.review.clear} body={COPY.review.clearBody} tag="THE DOCKET IS CLEAR" />
        ) : (
          <>
            {cards.map((row) =>
              certified[row.id] ? (
                <CertifiedCard key={row.id} row={certified[row.id]} />
              ) : (
                <DocketCard
                  key={row.id}
                  row={row}
                  budgets={budgets}
                  siblings={allRows}
                  busy={Boolean(pending[row.id])}
                  onCertify={async (category) => {
                    const updated = await updateRow(row.id, category === row.category ? {} : { category });
                    setCertified((c) => ({ ...c, [row.id]: { ...row, ...updated } }));
                  }}
                  onStrike={() => removeRow(row.id)}
                />
              )
            )}
            <p className="review__footer">{COPY.review.footer}</p>
          </>
        )}
      </ScreenBody>
    </Screen>
  );
}

function CertifiedCard({ row }) {
  return (
    <div className="docket docket--done">
      <div className="docket__stamp">Certified</div>
      <div className="mono docket__stampline truncate">
        {entryNo(row.id)} · {row.vendor} · {pesoFlat(row.amount)}
      </div>
    </div>
  );
}

function DocketCard({ row, budgets, siblings, busy, onCertify, onStrike }) {
  const [category, setCategory] = useState(row.category);
  const [expanded, setExpanded] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState(null);

  // With no parser narrative in the sheet, the card says what it actually
  // knows — and upgrades itself the day the back office starts writing notes.
  const question = row.notes?.trim() || COPY.review.question(row.source);

  // The parser's own choice leads; the alternatives are the categories this
  // counterparty has been filed under before, which is the only suggestion
  // the sheet can actually justify.
  const suggestions = useMemo(() => {
    const rank = (predicate) => {
      const tally = new Map();
      for (const r of siblings) {
        if (!r.category || r.category === row.category || !predicate(r)) continue;
        tally.set(r.category, (tally.get(r.category) || 0) + 1);
      }
      return [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    };
    // What this counterparty has been filed under before, and failing that,
    // what the book uses most. Never the sheet's row order — "Rent" is not a
    // plausible correction for a convenience store.
    const priors = rank((r) => r.vendor === row.vendor);
    const common = rank(() => true).filter((c) => !priors.includes(c));
    return [row.category, ...priors, ...common].filter(Boolean).slice(0, 3);
  }, [row.category, row.vendor, siblings]);

  const certify = async () => {
    setError(null);
    try {
      await onCertify(category);
    } catch (err) {
      setError(err.message);
    }
  };

  const strike = async () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    setError(null);
    try {
      await onStrike();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="docket">
      <div className="docket__head">
        <Monogram vendor={row.vendor} />
        <div className="docket__headtext">
          <div className="truncate docket__vendor">{row.vendor}</div>
          <div className="mono docket__when">
            {dayLabel(row.date)}
            {row.time ? ` · ${row.time}` : ''} · {row.paid_via || '—'}
          </div>
        </div>
        <div className="mono docket__amount">{pesoFlat(row.amount)}</div>
      </div>

      <div className="docket__question">
        <p>{question}</p>
      </div>

      <div className="docket__chips">
        {(expanded ? budgets.map((b) => b.category) : suggestions).map((c) => (
          <button
            key={c}
            className={`docket__chip${c === category ? ' docket__chip--on' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
        {!expanded && (
          <button className="docket__chip docket__chip--more" onClick={() => setExpanded(true)}>
            All {budgets.length} ›
          </button>
        )}
      </div>

      {error && <p className="docket__error">{error}</p>}

      <div className="docket__actions">
        <PillButton variant="teal" size="sm" grow={1.4} onClick={certify} disabled={busy}>
          {busy ? 'Filing…' : COPY.review.certify}
        </PillButton>
        <PillButton
          variant="outline"
          size="sm"
          grow={1}
          onClick={() => navigate(`/entry/${row.id}`)}
          disabled={busy}
        >
          {COPY.review.edit}
        </PillButton>
        <PillButton
          variant={armed ? 'danger-armed' : 'danger'}
          size="sm"
          grow={0}
          onClick={strike}
          disabled={busy}
          style={{ minWidth: armed ? 110 : 46, padding: 0 }}
        >
          {armed ? COPY.activity.strikeArmed : '✕'}
        </PillButton>
      </div>
    </div>
  );
}
