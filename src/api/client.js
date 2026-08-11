// The back-office adapter.
//
// Two Apps Script facts shape every line here:
//   1. It never answers a preflight OPTIONS, so each call must stay a
//      "simple request": POST, text/plain, no custom headers.
//   2. It answers with a 302 to script.googleusercontent.com, which the
//      browser follows on its own — so redirect must be left alone.

const TIMEOUT_CAPTURE = 45000; // a parse takes 3–8s, plus a cold start
const TIMEOUT_DEFAULT = 20000;

export class ApiError extends Error {
  constructor(kind, message, { retriable = false, hint = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.retriable = retriable;
    this.hint = hint;
  }
}

async function call(config, payload, { timeoutMs = TIMEOUT_DEFAULT } = {}) {
  if (!config?.url || !config?.token) {
    throw new ApiError('not-configured', 'The back office has not been connected on this device.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: config.token, ...payload }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new ApiError('timeout', 'The back office did not answer in time.', { retriable: true });
    }
    throw new ApiError('network', 'The back office is unreachable.', { retriable: true });
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new ApiError('http', `The back office answered ${res.status}.`, { retriable: true });
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError('bad-json', 'The back office answered with a page, not a filing.', {
      retriable: true,
      hint: 'Check the deployment is set to run as you, with access set to Anyone.',
    });
  }

  if (data && data.ok === false) {
    const message = data.message || data.error || 'The filing was refused.';
    if (/password/i.test(String(data.error || data.message || ''))) {
      throw new ApiError('auth', 'Wrong or missing back-office credential.');
    }
    if (/not a receipt/i.test(String(data.error || ''))) {
      throw new ApiError('not-receipt', message);
    }
    throw new ApiError('backend', message, { retriable: true });
  }

  return data;
}

export function createClient(config) {
  return {
    /** A lightweight round trip that also proves the credential. */
    async ping() {
      const data = await call(config, { action: 'budgets' }, { timeoutMs: 12000 });
      return { ok: true, count: (data.budgets || []).length };
    },

    async list(month) {
      const data = await call(config, month ? { action: 'list', month } : { action: 'list' });
      return data.rows || [];
    },

    async budgets() {
      const data = await call(config, { action: 'budgets' });
      return data.budgets || [];
    },

    /**
     * No action field: this is the payload shape the iPhone Shortcut has
     * always sent, and the back office must keep treating it as it always has.
     */
    async capture(payload) {
      return call(config, { ...payload, source: 'app' }, { timeoutMs: TIMEOUT_CAPTURE });
    },

    async update(id, fields) {
      const data = await call(config, { action: 'update', id, fields });
      return data.row;
    },

    async remove(id) {
      await call(config, { action: 'delete', id });
      return { ok: true };
    },

    now() {
      return new Date();
    },
  };
}
