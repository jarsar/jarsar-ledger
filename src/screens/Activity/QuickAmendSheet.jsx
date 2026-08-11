import { useEffect, useState } from 'react';
import BottomSheet from '../../components/BottomSheet';
import Monogram from '../../components/Monogram';
import PillButton from '../../components/PillButton';
import { AmountDisplay } from '../../components/Bits';
import { useLedger } from '../../state/LedgerContext';
import { entryNo, dayLabel } from '../../lib/format';
import { COPY } from '../../lib/copy';
import { navigate } from '../../router';
import './QuickAmendSheet.css';

const METHODS = ['GCash', 'Cash', 'Visa 9956', 'Grab - Visa 9956', 'Splitwise'];

export default function QuickAmendSheet({ row, onClose }) {
  const { updateRow, removeRow, pending } = useLedger();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [pickingMethod, setPicking] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!row) return;
    setAmount(String(row.amount ?? ''));
    setMethod(row.paid_via || '');
    setPicking(false);
    setArmed(false);
    setError(null);
  }, [row]);

  if (!row) return <BottomSheet open={false} onClose={onClose} />;

  const busy = Boolean(pending[row.id]);
  const dirty = Number(amount) !== Number(row.amount) || method !== (row.paid_via || '');

  const certify = async () => {
    setError(null);
    const fields = {};
    if (Number(amount) !== Number(row.amount)) fields.amount = Number(amount);
    if (method !== (row.paid_via || '')) fields.paid_via = method;
    try {
      await updateRow(row.id, fields);
      onClose();
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
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <BottomSheet open onClose={onClose}>
      <div className="qa__head">
        <Monogram vendor={row.vendor} size={44} />
        <div className="qa__headtext">
          <div className="truncate qa__vendor">{row.vendor}</div>
          <div className="qa__item">{row.item}</div>
        </div>
      </div>

      <label className="qa__amountwrap">
        <span className="qa__amountghost">
          <AmountDisplay value={Number(amount) || 0} size={32} />
        </span>
        <input
          className="mono qa__amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          aria-label="Amount"
        />
      </label>

      <div className="qa__chips">
        <button className="mono qa__chip" onClick={() => setPicking((p) => !p)}>
          {method || 'method'} ▾
        </button>
        <button className="mono qa__chip" onClick={() => navigate(`/entry/${row.id}`)}>
          {row.time ? `${row.time} · ` : ''}
          {dayLabel(row.date)} ▾
        </button>
        <span className="mono qa__chip qa__chip--static">{entryNo(row.id)}</span>
      </div>

      {pickingMethod && (
        <div className="qa__methods">
          {METHODS.map((m) => (
            <button
              key={m}
              className={`mono qa__method${m === method ? ' qa__method--on' : ''}`}
              onClick={() => {
                setMethod(m);
                setPicking(false);
              }}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <p className="qa__note">{COPY.activity.sheetNote}</p>
      {error && <p className="qa__error">{error}</p>}

      <div className="qa__actions">
        <PillButton variant="teal" grow={1.4} onClick={certify} disabled={busy}>
          {busy ? 'Filing…' : COPY.review.certify}
        </PillButton>
        <PillButton variant="outline" grow={1} onClick={() => navigate(`/entry/${row.id}`)} disabled={busy}>
          {COPY.activity.openFull}
        </PillButton>
        <PillButton
          variant={armed ? 'danger-armed' : 'danger'}
          grow={0}
          onClick={strike}
          disabled={busy}
          style={{ minWidth: armed ? 116 : 50, padding: 0 }}
        >
          {armed ? COPY.activity.strikeArmed : '✕'}
        </PillButton>
      </div>
      {dirty && !busy && <div className="mono qa__dirty">CERTIFYING WILL AMEND THE BOOK</div>}
    </BottomSheet>
  );
}
