import { useEffect, useMemo, useState } from 'react';
import Screen, { ScreenBody } from '../components/Screen';
import Monogram from '../components/Monogram';
import PillButton from '../components/PillButton';
import Chip from '../components/Chip';
import { AmountDisplay } from '../components/Bits';
import { ChevronLeft } from '../components/Icons';
import { useLedger } from '../state/LedgerContext';
import { entryNo, dayLabel } from '../lib/format';
import { COPY } from '../lib/copy';
import { goBack } from '../router';
import './Amend.css';

const METHODS = ['GCash', 'Cash', 'Visa 9956', 'Grab - Visa 9956', 'Splitwise'];

export default function Amend({ id }) {
  const { allRows, budgets, updateRow, removeRow, pending } = useLedger();
  const row = useMemo(() => allRows.find((r) => r.id === id), [allRows, id]);

  const [draft, setDraft] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (row && !draft) {
      setDraft({
        amount: String(row.amount ?? ''),
        vendor: row.vendor || '',
        item: row.item || '',
        date: row.date || '',
        time: row.time || '',
        category: row.category || '',
        paid_via: row.paid_via || '',
      });
    }
  }, [row, draft]);

  if (!row) {
    return (
      <Screen variant="fog">
        <div className="amend__missing">
          <p>That entry is no longer in the book.</p>
          <PillButton variant="outline" onClick={() => goBack('/activity')}>
            Back
          </PillButton>
        </div>
      </Screen>
    );
  }

  if (!draft) return <Screen variant="fog" />;

  const busy = Boolean(pending[row.id]);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const changed = () => {
    const out = {};
    if (Number(draft.amount) !== Number(row.amount)) out.amount = Number(draft.amount);
    if (draft.vendor !== row.vendor) out.vendor = draft.vendor;
    if (draft.item !== row.item) out.item = draft.item;
    if (draft.date !== row.date) out.date = draft.date;
    if (draft.time !== (row.time || '')) out.time = draft.time;
    if (draft.category !== row.category) out.category = draft.category;
    if (draft.paid_via !== (row.paid_via || '')) out.paid_via = draft.paid_via;
    return out;
  };

  const dirty = Object.keys(changed()).length > 0;

  const certify = async () => {
    setError(null);
    try {
      await updateRow(row.id, changed());
      goBack('/activity');
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
      await removeRow(row.id);
      goBack('/activity');
    } catch (err) {
      setError(err.message);
    }
  };

  const categories = expanded ? budgets.map((b) => b.category) : budgets.slice(0, 5).map((b) => b.category);

  return (
    <Screen variant="fog" scroll={false}>
      <div className="amend__head">
        <button className="amend__back" onClick={() => goBack('/activity')}>
          <ChevronLeft />
          <span>Activity</span>
        </button>
        <span className="mono amend__slug">
          {entryNo(row.id)} · VIA {(row.source || '?').toUpperCase()}
        </span>
      </div>

      <ScreenBody className="amend__body">
        <div className="amend__identity">
          <Monogram vendor={draft.vendor} size={46} />
          <div className="amend__identitytext">
            <input
              className="amend__vendor"
              value={draft.vendor}
              onChange={(e) => set('vendor', e.target.value)}
              aria-label="Vendor"
            />
            <div className="amend__when">
              {dayLabel(draft.date)}
              {draft.time ? ` · ${draft.time}` : ''} · {draft.paid_via || 'method unstated'}
            </div>
          </div>
          {row.review === 'check' && <Chip text={COPY.amend.inReview} kind="amber" />}
        </div>

        <div className="card amend__amountcard">
          <label className="amend__amountwrap">
            <span className="amend__amountghost">
              <AmountDisplay value={Number(draft.amount) || 0} size={38} />
            </span>
            <input
              className="mono amend__amount"
              inputMode="decimal"
              value={draft.amount}
              onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, ''))}
              aria-label="Amount"
            />
          </label>
          <div className="mono amend__amounthint">{COPY.amend.tapToEdit}</div>
        </div>

        <div className="card amend__fields">
          <label className="amend__field">
            <span className="mono amend__fieldlabel">ITEM</span>
            <input value={draft.item} onChange={(e) => set('item', e.target.value)} />
          </label>
          <label className="amend__field">
            <span className="mono amend__fieldlabel">DATE</span>
            <input className="mono" type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label className="amend__field">
            <span className="mono amend__fieldlabel">TIME</span>
            <input className="mono" type="time" value={draft.time} onChange={(e) => set('time', e.target.value)} />
          </label>
        </div>

        <div className="mono amend__sectionlabel">METHOD</div>
        <div className="amend__chips">
          {METHODS.map((m) => (
            <button
              key={m}
              className={`amend__chip${m === draft.paid_via ? ' amend__chip--on' : ''}`}
              onClick={() => set('paid_via', m)}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mono amend__sectionlabel">CATEGORY</div>
        <div className="amend__chips">
          {categories.map((c) => (
            <button
              key={c}
              className={`amend__chip${c === draft.category ? ' amend__chip--on' : ''}`}
              onClick={() => set('category', c)}
            >
              {c}
            </button>
          ))}
          {!expanded && budgets.length > 5 && (
            <button className="amend__chip amend__chip--more" onClick={() => setExpanded(true)}>
              All {budgets.length} ›
            </button>
          )}
        </div>

        <div className="card amend__prov">
          <div className="mono amend__provlabel">{COPY.amend.provenance}</div>
          <p className="amend__provbody">
            {row.notes?.trim() ||
              `Delivered by ${row.source === 'gmail' ? 'the Gmail watcher' : row.source === 'shortcut' ? 'the share-sheet Shortcut' : 'this app'} and filed under ${row.category}.`}
          </p>
          <div className="mono amend__provid">ENTRY {row.id}</div>
        </div>

        {error && <p className="amend__error">{error}</p>}

        <div className="amend__actions">
          <PillButton variant="teal" size="lg" grow={1.5} onClick={certify} disabled={busy || !dirty}>
            {busy ? 'Filing…' : COPY.amend.certify}
          </PillButton>
          <PillButton
            variant={armed ? 'danger-armed' : 'danger'}
            size="lg"
            grow={1}
            onClick={strike}
            disabled={busy}
          >
            {armed ? COPY.activity.strikeArmed : COPY.amend.strike}
          </PillButton>
        </div>
      </ScreenBody>
    </Screen>
  );
}
