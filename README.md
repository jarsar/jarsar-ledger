# JarSar Ledger

The phone face of the JarSar Capital expense book — a progressive web app that
reads and amends a Google Sheet through an Apps Script back office.

The sheet stays the database. This app only reads and appends.

## What it is

A static site: React, Vite, no service worker, no server of its own. It holds
no secrets. On first run it asks for the back-office address and credential,
keeps them in `localStorage` on that device, and sends them with each call.

Five stations — Home, Activity, Capture, Radar, More — with Review reached as
a summons from Activity, Radar and the board note rather than as a sixth tab.

## Running it

```bash
npm install
npm run dev
```

Open the address it prints. On first run, either connect a real back office or
follow *explore the demo book* — the demo serves a complete August and July
from memory, including three entries waiting in Review and every failure
state, so the whole app can be walked without a credential.

In the demo's capture screen, a typed line containing `fail`, `cat` or `blur`
produces the unreachable, not-a-receipt and sent-to-review states respectively.

## Tests

```bash
npm test
```

Two suites, both worth reading before changing anything:

- `src/lib/__tests__/engine.test.js` — the aggregates engine against the
  design's published figures. August must total ₱57,820.73 across 47 entries
  at 75.5% drawn, with every budget chip computed rather than asserted.
- `scripts/test-backend.mjs` — the Apps Script handlers, run against a
  simulated spreadsheet. The one that matters most is the last: a request body
  with no `action` field must still take the original logging path, because
  that is what the iPhone Shortcut sends.

## The back office

`Code.gs` is the Apps Script attached to the sheet. It is **not committed** —
it is personal, and it is listed in `.gitignore` along with the design source.

This build added an action router to `doPost` and four handlers:

| action | body | returns |
|---|---|---|
| *(none)* or `log` | `{text?, image?, mimeType?, source?}` | unchanged — the original capture path |
| `list` | `{month?}` | `{ok, rows[]}` — one month, or the recent 200 |
| `budgets` | — | `{ok, budgets[]}` — caps and groups, `null` cap means uncapped |
| `update` | `{id, fields}` | `{ok, row}` — amends, and clears the review flag |
| `delete` | `{id}` | `{ok, id}` |

Two constraints shaped the client, and both are easy to undo by accident:

1. **Apps Script never answers a preflight `OPTIONS`.** Every call must stay a
   simple request: `POST`, `Content-Type: text/plain;charset=utf-8`, no other
   headers, and `redirect` left alone so the browser follows the 302 to
   `script.googleusercontent.com`.
2. **The repository is public.** No address, credential or key may ever be
   committed. They are entered at runtime and stored on the device.

### Deploying a change to `Code.gs`

1. Open the sheet → Extensions → Apps Script, and paste the file over `Code.gs`.
2. Deploy → Manage deployments → the existing deployment → edit → **New
   version** → Deploy. The web-app URL does not change, so the Shortcut and
   the Gmail watcher keep working.
3. Run the live regression, which files a test entry and strikes it out again:

   ```bash
   ./scripts/check-backend-live.sh <WEB_APP_URL> <TOKEN>
   ```

4. File one real receipt through the iPhone Shortcut to confirm the fast lane
   still works.

## Deploying the app

Pushing to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`).
Set the repository's Pages source to **GitHub Actions** once, and enable Pages.

Vite is configured with a relative `base`, so the same build works at a
project path, at a domain root, and under `npm run preview`.

On the phone: open the Pages URL in Safari, Share → Add to Home Screen. It
launches standalone with the pace mark as its icon and the label *Ledger*.

## Design

Built from the Claude Design project *JarSar Ledger — Boardroom Build*. The
source document is kept in `design/` (gitignored) — read it before changing
anything visual. Tokens live in `src/styles/tokens.css` and are the design's,
verbatim.

Three rules the code keeps and should go on keeping:

- **Every numeral is DM Mono.** No exceptions, anywhere.
- **Amber is time, mint is clearance, coral is breach.** Coral never decorates;
  it appears only when something is over a cap or a filing has failed.
- **The waiting state is honest.** The filing log prints only facts the client
  knows, the progress hairline advances with real elapsed time toward 82%, and
  nothing completes until the back office has actually answered.

### Two places where the design contradicted itself

Both were resolved in favour of the figures the app can actually compute:

- **July's totals.** The frame prints ₱63,118.40 with a "82.4% drawn" pill,
  but its own category rows sum to about ₱74k. Rows win: the hero is computed
  from the entries, so the demo's July reads ~₱74,196 at 96.9%.
- **Fund balances.** The design shows Travel/Gadgets/Gifts with balances, but
  the sheet records only expenses — a balance cannot be derived from it. The
  fund cards show this month's draw instead, or `QUIET` when there is none.
