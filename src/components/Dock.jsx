import { navigate } from '../router';
import { HomeIcon, ActivityIcon, RadarIcon, MoreIcon } from './Icons';
import './Dock.css';

const STATIONS = [
  { name: 'home', path: '/', label: 'HOME', Icon: HomeIcon },
  { name: 'activity', path: '/activity', label: 'ACTIVITY', Icon: ActivityIcon },
  { name: 'radar', path: '/radar', label: 'RADAR', Icon: RadarIcon },
  { name: 'more', path: '/more', label: 'MORE', Icon: MoreIcon },
];

/**
 * Four stations around one raised amber FAB (design 1k). Review is not a
 * station — it is a summons, reached from Activity's chip, Radar, and the
 * board note. Rendered once at the app root so it never re-mounts.
 */
export default function Dock({ active }) {
  const station = ({ name, path, label, Icon }) => (
    <button
      key={name}
      className="dock__station"
      onClick={() => navigate(path)}
      aria-current={active === name ? 'page' : undefined}
      aria-label={label}
    >
      <Icon active={active === name} />
      <span className={`dock__label mono${active === name ? ' dock__label--active' : ''}`}>{label}</span>
    </button>
  );

  return (
    <nav className="dock chrome" aria-label="Stations">
      {station(STATIONS[0])}
      {station(STATIONS[1])}
      <div className="dock__fabwrap">
        <button className="dock__fab" onClick={() => navigate('/capture')} aria-label="File an entry">
          <span className="dock__fabglyph">+</span>
        </button>
      </div>
      {station(STATIONS[2])}
      {station(STATIONS[3])}
    </nav>
  );
}
