import './Chip.css';

/**
 * The status chip. Kind carries the whole meaning: amber is time, mint is
 * clearance, coral is breach, grey is a settled or uncapped fact.
 */
export default function Chip({ text, kind = 'grey', className = '' }) {
  return <span className={`chip chip--${kind} mono nowrap ${className}`}>{text}</span>;
}
