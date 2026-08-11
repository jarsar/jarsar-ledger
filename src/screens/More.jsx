import { useMemo, useState } from 'react';
import Screen, { ScreenBody } from '../components/Screen';
import { StatusDot } from '../components/Bits';
import { useLedger } from '../state/LedgerContext';
import { useSettings } from '../state/SettingsContext';
import { doorsStatus } from '../lib/selectors';
import { monthName, dayLabel, daysBetween } from '../lib/format';
import { COPY, DOOR_LABELS } from '../lib/copy';
import './More.css';

/**
 * What the device actually reports about its own geometry. Safe-area insets
 * and the standalone flag cannot be reproduced in a desktop browser, so when
 * the dock sits wrong on a real phone this is the only way to see why.
 *
 * Revealed by tapping the build line three times — an installed app launches
 * at its start URL and drops any hash, so a ?debug=1 link cannot reach it.
 */
function DeviceReport() {
  const probe = useMemo(() => {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:0;left:0;visibility:hidden;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
      'env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(el);
    const cs = getComputedStyle(el);
    const read = { top: cs.paddingTop, right: cs.paddingRight, bottom: cs.paddingBottom, left: cs.paddingLeft };
    el.remove();
    return read;
  }, []);

  const dock = document.querySelector('.dock')?.getBoundingClientRect();
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // If the page is shorter than the screen while standalone, iOS is painting
  // bands above and below it in the manifest's background colour — which is
  // fog, so they look like part of the app rather than like letterboxing.
  const unclaimed = window.screen.height - window.innerHeight;

  const lines = [
    ['screen', `${window.screen.width}×${window.screen.height}`],
    ['viewport', `${window.innerWidth}×${window.innerHeight}`],
    ['unclaimed height', `${unclaimed}px`],
    ['safe top / bottom', `${probe.top} / ${probe.bottom}`],
    ['dock bottom css', dock ? getComputedStyle(document.querySelector('.dock')).bottom : '—'],
    ['dock gap in page', dock ? `${Math.round(window.innerHeight - dock.bottom)}px` : '—'],
    ['gap on screen', dock ? `${Math.round(window.screen.height - dock.bottom)}px` : '—'],
    ['standalone', standalone ? 'yes' : 'no (Safari)'],
    ['dpr', String(window.devicePixelRatio)],
  ];

  return (
    <>
      <div className="mono more__label">DEVICE</div>
      <div className="card more__block">
        {lines.map(([k, v]) => (
          <div className="more__bookline" key={k} style={{ padding: '4px 0' }}>
            <span className="mono more__value">{k}</span>
            <span className="mono more__value" style={{ color: 'var(--ink)' }}>{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function More({ debug = false }) {
  const { today, allRows, connection, checkConnection, resync, months } = useLedger();
  const settings = useSettings();
  const [armed, setArmed] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [taps, setTaps] = useState(0);
  const showDevice = debug || taps >= 3;

  const doors = useMemo(() => doorsStatus(allRows), [allRows]);
  const known = allRows.length;

  const syncedAgo = connection.lastOkAt
    ? Math.max(0, Math.round((Date.now() - connection.lastOkAt) / 60000))
    : null;

  const doorLine = (key) => {
    const d = doors[key];
    if (!d) return { text: known ? `NOT IN THE LAST ${known} ENTRIES` : 'NO ENTRIES YET', live: false };
    const age = daysBetween(d.date, today.iso);
    // The watcher delivers what arrives; the other two doors file what you
    // hand them. The verb should say which is which.
    const verb = key === 'gmail' ? 'DELIVERED' : 'FILED';
    const when =
      age === 0
        ? `${verb} ${d.time || ''} TODAY`.replace(/\s+/g, ' ').trim()
        : `${verb} ${dayLabel(d.date)}${d.time ? ` ${d.time}` : ''}`;
    return { text: when.toUpperCase(), live: age <= 7 };
  };

  return (
    <Screen variant="fog" scroll={false}>
      <div className="more__head">
        {/* Three taps on the title opens the device report. The title is the
            easiest thing on the screen to hit, and nothing overlaps it. */}
        <button className="more__title" onClick={() => setTaps((t) => t + 1)}>
          {COPY.more.title}
        </button>
        {settings.demo && <span className="mono more__demochip">DEMO BOOK</span>}
      </div>

      <ScreenBody dock className="more__body">
        <div className="mono more__label">{COPY.more.registry}</div>
        <div className="card more__card">
          <div className="more__row">
            <span>Fiscal year</span>
            <span className="mono more__value">FY{today.year}</span>
          </div>
          <div className="more__row">
            <span>Reporting month</span>
            <span className="mono more__value">{monthName(today.month).toUpperCase()}</span>
          </div>
          <div className="more__row">
            <span>Months held on this device</span>
            <span className="mono more__value">{Object.keys(months).length}</span>
          </div>
        </div>

        <div className="mono more__label">{COPY.more.book}</div>
        <div className="card more__block">
          <div className="more__bookline">
            <span className="mono more__filename">
              {settings.demo ? 'demo_ledger_fy2026' : 'the sheet'}
            </span>
            {settings.book ? (
              <a className="more__open" href={settings.book} target="_blank" rel="noreferrer">
                Open ↗
              </a>
            ) : (
              <button className="more__open more__open--set" onClick={() => promptBook(settings)}>
                Add link
              </button>
            )}
          </div>
          <p className="more__note">{COPY.more.bookNote}</p>
        </div>

        <div className="mono more__label">{COPY.more.doors}</div>
        <div className="card more__card">
          {Object.keys(DOOR_LABELS).map((key) => {
            const line = doorLine(key);
            return (
              <div className="more__row" key={key}>
                <span>{DOOR_LABELS[key]}</span>
                <span className="more__status">
                  <span className="mono more__value">{line.text}</span>
                  <StatusDot tone="mint" size={7} hollow={!line.live} />
                </span>
              </div>
            );
          })}
        </div>

        <div className="mono more__label">{COPY.more.connection}</div>
        <div className="card more__block">
          <button className="more__bookline more__connrow" onClick={checkConnection}>
            <span>Back office</span>
            <span className="more__status">
              <span className={`mono more__value${connection.error ? ' more__value--bad' : ''}`}>
                {connection.checking
                  ? 'CHECKING…'
                  : connection.error
                    ? 'NOT REACHABLE'
                    : syncedAgo === null
                      ? 'NOT YET CHECKED'
                      : `REACHABLE · SYNCED ${syncedAgo} MIN AGO`}
              </span>
              <StatusDot tone={connection.error ? 'coral' : 'mint'} size={7} pulse={!connection.error} />
            </span>
          </button>
        </div>

        <div className="card more__block more__resync">
          <button
            className="more__resyncbtn"
            onClick={async () => {
              setResyncing(true);
              await resync();
              setResyncing(false);
            }}
            disabled={resyncing}
          >
            {resyncing ? 'Reading the book…' : COPY.more.resync}
          </button>
          <p className="more__note">{COPY.more.resyncNote}</p>
        </div>

        <div className="mono more__label">{COPY.more.credential}</div>
        <div className="card more__card">
          {settings.demo ? (
            <>
              <div className="more__row">
                <span>{COPY.more.demoOn}</span>
                <span className="mono more__value">NO CREDENTIAL IN USE</span>
              </div>
              <button className="more__row more__row--action" onClick={settings.leaveDemo}>
                <span className="more__danger">{COPY.more.demoExit}</span>
              </button>
            </>
          ) : (
            <>
              <div className="more__row">
                <span>{COPY.more.heldHere}</span>
                <span className="mono more__value">HELD LOCALLY</span>
              </div>
              <button
                className="more__row more__row--action"
                onClick={() => {
                  if (!armed) {
                    setArmed(true);
                    setTimeout(() => setArmed(false), 4000);
                    return;
                  }
                  settings.revoke();
                }}
              >
                <span className="more__danger">{armed ? COPY.more.revokeArmed : COPY.more.revoke}</span>
              </button>
            </>
          )}
        </div>

        {!settings.demo && (
          <button className="card more__block more__demoenter" onClick={settings.enterDemo}>
            {COPY.more.demoEnter}
          </button>
        )}

        {showDevice && <DeviceReport />}

        <div className="mono more__footer">{COPY.build}</div>
      </ScreenBody>
    </Screen>
  );
}

function promptBook(settings) {
  const url = window.prompt('Paste the link to the sheet. It is stored on this device only.');
  if (url) settings.setBook(url.trim());
}
