import { useEffect, useState } from 'react';
import './BottomSheet.css';

/** The quick-amend sheet: 320ms up on the one easing, 260ms back down. */
export default function BottomSheet({ open, onClose, children }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 260);
      return () => clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <>
      <div className={`sheet__scrim${closing ? ' sheet__scrim--out' : ''}`} onClick={onClose} />
      <div className={`sheet${closing ? ' sheet--out' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet__grabber" />
        {children}
      </div>
    </>
  );
}
