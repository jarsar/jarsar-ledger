import { useEffect } from 'react';
import './Screen.css';

const THEME = { room: '#1D3B42', fog: '#EDF1EF', dark: '#10191B' };

/**
 * Every frame in the design is one of two scaffolds:
 *   plain — a header above a single scrolling region
 *   ramp  — a fixed coloured zone above a scrolling fog sheet (Activity, Home)
 *
 * The design's frames pad 62–74px for the iOS status bar; as a real page we
 * take the safe-area inset instead, which collapses to 32px on a desktop.
 */
export default function Screen({
  variant = 'fog',
  children,
  dock = false,
  scroll = true,
  className = '',
}) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME[variant] || THEME.fog);
  }, [variant]);

  const body = scroll ? (
    <div className={`screen__scroll${dock ? ' screen__scroll--dock' : ''}`}>{children}</div>
  ) : (
    children
  );

  return <div className={`screen screen--${variant} ${className}`}>{body}</div>;
}

/** The fixed top zone of a ramp screen — it never scrolls. */
export function ScreenTop({ children, className = '', tone = 'room' }) {
  return <div className={`screen__top screen__top--${tone} ${className}`}>{children}</div>;
}

/** The scrolling region beneath a ramp's fixed top. */
export function ScreenBody({ children, dock = false, sheet = false, className = '' }) {
  return (
    <div
      className={`screen__scroll${dock ? ' screen__scroll--dock' : ''}${
        sheet ? ' screen__scroll--sheet' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
