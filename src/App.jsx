import { useEffect } from 'react';
import { useHashRoute, isStation } from './router';
import { useSettings } from './state/SettingsContext';
import Dock from './components/Dock';
import Setup from './screens/Setup';
import Home from './screens/Home/Home';
import Activity from './screens/Activity/Activity';
import Capture from './screens/Capture/Capture';
import Review from './screens/Review/Review';
import Amend from './screens/Amend';
import Radar from './screens/Radar/Radar';
import More from './screens/More';

/**
 * Some installed-app configurations hand the page less height than the
 * screen and fill the remainder themselves. The page cannot draw into that
 * band, so the dock stops floating above the page's bottom edge and sits on
 * it — which is as close to the screen's bottom as anything here can get.
 */
function useUnclaimedHeight() {
  useEffect(() => {
    const measure = () => {
      const unclaimed = Math.max(0, window.screen.height - window.innerHeight);
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      if (standalone && unclaimed > 8) {
        document.documentElement.style.setProperty('--dock-bottom', '0px');
      } else {
        document.documentElement.style.removeProperty('--dock-bottom');
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);
}

export default function App() {
  const route = useHashRoute();
  const settings = useSettings();
  useUnclaimedHeight();

  // Nothing can be shown until the device knows which book it belongs to.
  if (!settings.connected) return <Setup />;

  const screen = () => {
    switch (route.name) {
      case 'activity':
        return <Activity query={route.query.q || ''} />;
      case 'capture':
        return <Capture />;
      case 'radar':
        return <Radar />;
      case 'more':
        return <More debug={route.query.debug === '1'} />;
      case 'review':
        return <Review />;
      case 'entry':
        return <Amend id={route.param} />;
      case 'setup':
        return <Setup />;
      default:
        return <Home focus={route.query.focus || null} />;
    }
  };

  const station = route.name || 'home';
  // Home's budget sheet and Activity's list are fog; Radar's feed is the room.
  const veil = station === 'radar' ? 'room' : 'fog';

  return (
    <>
      {screen()}
      {isStation(route.name) || route.name === 'home' ? <Dock active={station} tone={veil} /> : null}
    </>
  );
}
