import { useState } from 'react';
import Screen from '../components/Screen';
import PaceMark from '../components/PaceMark';
import PillButton from '../components/PillButton';
import { StatusDot } from '../components/Bits';
import { useSettings } from '../state/SettingsContext';
import { createClient } from '../api/client';
import { COPY } from '../lib/copy';
import './Setup.css';

export default function Setup() {
  const { connect, enterDemo } = useSettings();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [state, setState] = useState({ phase: 'idle', message: null });

  const submit = async () => {
    const cleanUrl = url.trim();
    const cleanToken = token.trim();
    if (!cleanUrl || !cleanToken) {
      setState({ phase: 'error', message: 'Both the address and the credential are needed.' });
      return;
    }
    setState({ phase: 'checking', message: null });
    try {
      const { count } = await createClient({ url: cleanUrl, token: cleanToken }).ping();
      setState({ phase: 'ok', message: COPY.setup.reachable(count) });
      setTimeout(() => connect(cleanUrl, cleanToken), 600);
    } catch (err) {
      setState({ phase: 'error', message: err.hint || COPY.setup.unreachable });
    }
  };

  return (
    <Screen variant="room">
      <div className="setup">
        <PaceMark size={76} glass />
        <div className="setup__wordmark">{COPY.brand}</div>
        <div className="mono setup__fiscal">{COPY.fiscal}</div>
        <p className="setup__lede">{COPY.setup.lede}</p>

        <div className="setup__card">
          <label className="mono setup__label" htmlFor="setup-url">
            {COPY.setup.urlLabel}
          </label>
          <input
            id="setup-url"
            className="mono setup__field setup__field--url"
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder={COPY.setup.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <label className="mono setup__label setup__label--spaced" htmlFor="setup-token">
            {COPY.setup.tokenLabel}
          </label>
          <input
            id="setup-token"
            className="mono setup__field setup__field--token"
            type="password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder="••••••••••••••••"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />

          <p className="setup__note">{COPY.setup.note}</p>

          <PillButton
            variant="amber"
            size="lg"
            className="setup__connect"
            onClick={submit}
            disabled={state.phase === 'checking'}
          >
            {state.phase === 'checking' ? 'Connecting…' : COPY.setup.connect}
          </PillButton>
        </div>

        <div className="setup__status">
          {state.phase === 'idle' ? (
            <span className="mono setup__statustext">THE CREDENTIAL NEVER LEAVES THIS DEVICE</span>
          ) : (
            <>
              <StatusDot
                tone={state.phase === 'ok' ? 'room' : state.phase === 'error' ? 'coral' : 'amber'}
                hollow={state.phase === 'checking'}
                pulse={state.phase === 'ok'}
                size={6}
              />
              <span className={`mono setup__statustext${state.phase === 'error' ? ' setup__statustext--bad' : ''}`}>
                {state.phase === 'checking' ? COPY.setup.connecting : state.message}
              </span>
            </>
          )}
        </div>

        <button className="mono setup__demo" onClick={enterDemo}>
          {COPY.setup.demo}
        </button>
      </div>
    </Screen>
  );
}
