// Every user-facing string, in one place.
//
// The shell is modern — Home, Activity, Review, More, Filing. The registrar
// survives in exactly four places and nowhere else: the closing line of the
// filing log, the Certify button, the board note, and Radar's quiet tape.
// Nothing winks. No emoji, anywhere.

export const COPY = {
  brand: 'Ledger',
  ticker: '$JARC',
  fiscal: 'JARSAR · FY2026 · $JARC',
  build: 'JARSAR LEDGER · BUILD v1 · $JARC',

  setup: {
    lede:
      'This phone becomes the desk. Paste the back-office address and credential once and every door — Shortcut, mail, this app — files into the same book.',
    urlLabel: 'BACK OFFICE',
    urlPlaceholder: 'https://script.google.com/…/exec',
    tokenLabel: 'CREDENTIAL',
    note: 'Stays on this device. Sent with each filing, stored nowhere else.',
    connect: 'Connect the back office',
    connecting: 'REACHING THE BACK OFFICE…',
    reachable: (n) => `BACK OFFICE REACHABLE · ${n} CATEGORIES`,
    unreachable: 'NOT REACHABLE — CHECK THE ADDRESS AND CREDENTIAL',
    demo: 'or explore the demo book →',
  },

  capture: {
    title: 'Capture',
    guide: 'Receipts, invoices, chits — flat and near',
    typedPlaceholder: 'parking 50 tiendesitas cash',
    footnote: 'The share-sheet Shortcut stays the fast lane. This desk is for cash and stragglers.',
    filing: 'Filing…',
    // The registrar's one soliloquy.
    entered: 'entered into record — true and fair.',
    done: 'Entered into record',
    amend: 'Amend',
    finish: 'Done',
  },

  failure: {
    title: 'Filing failed. This entry was not recorded.',
    held: 'HELD ON THIS SCREEN ONLY',
    body: 'There is no offline queue. Leave this screen and the entry is gone — it must be captured again.',
    resubmit: 'Resubmit now',
    copy: 'Copy the line',
    copied: 'Copied',
  },

  notReceipt: {
    title: "That's not a receipt.",
    body: 'Nothing was filed. If it is one, hold it flatter and nearer — the read failed on the whole frame.',
    retake: 'Retake',
    type: 'Type it instead',
  },

  review: {
    sentTitle: 'Received, but not readable.',
    sentBody: "The instrument is safe — it's docketed in Review until you confirm what it says.",
    sentChip: 'SENT TO REVIEW',
    open: 'Open Review',
    safe: 'Nothing is lost; it waits for you.',
    title: 'Review',
    lede: "The weekly sweep. These couldn't be filed without you.",
    certify: 'Certify',
    edit: 'Edit',
    footer: "Certified entries return to the book bearing today's date.",
    clear: 'The docket is clear',
    clearBody: 'Nothing is waiting on you. The book is current.',
    // Used when the parser left no note of its own.
    question: (source) => `Filed via ${source || 'an unknown door'} and flagged — confirm the figures below.`,
  },

  activity: {
    title: 'Activity',
    search: 'Search the book…',
    empty: 'No entries yet',
    emptyBody: 'The first filing — by Shortcut, by mail, or here — lands in this list.',
    emptyTag: 'AWAITING FIRST ENTRY',
    sheetNote: 'Every field is editable — the machine is usually right, occasionally not.',
    strike: 'Strike',
    strikeArmed: 'Strike?',
    openFull: 'Open full',
  },

  amend: {
    tapToEdit: 'TAP ANY FIELD TO EDIT',
    provenance: 'PROVENANCE',
    certify: 'Certify changes',
    strike: 'Strike',
    inReview: 'IN REVIEW',
  },

  home: {
    budgets: 'Budgets',
    funds: 'Funds',
    fundsNote: 'TRACKED · NEVER CAPPED',
    fundsThisMonth: 'THIS MONTH',
    fundsQuiet: 'QUIET',
    sixMonths: 'Six months',
    counterparties: 'Counterparties',
    boardTitle: 'THE BOARD MEETING',
    boardAction: 'Prepare the papers →',
    closed: 'Month closed — certified at the board meeting.',
    board: ({ month, days, docket, worst }) =>
      `The ${month} session convenes in ${days} ${days === 1 ? 'day' : 'days'}. ` +
      `The docket stands at ${docket}` +
      (worst.length ? `; ${worst.join(' and ')} will be questioned.` : '.'),
  },

  radar: {
    title: 'Radar',
    dismiss: 'Dismiss',
    // The registrar's fourth and last appearance.
    quiet: '— nothing further. the tape is quiet —',
    quietAlone: 'The tape is quiet. Nothing to report.',
  },

  more: {
    title: 'More',
    registry: 'REGISTRY',
    book: 'THE BOOK',
    bookNote: 'The sheet stays the database; this app only reads and appends.',
    credential: 'CREDENTIAL',
    heldHere: 'Held on this device',
    revoke: 'Revoke and retire this device',
    revokeArmed: 'Revoke — tap again to confirm',
    doors: 'THE DOORS',
    connection: 'CONNECTION',
    resync: 'Resync from the sheet',
    resyncNote: 'Forgets what this device remembers and reads the book again — use it after editing rows in the sheet by hand.',
    demoOn: 'Demo book active',
    demoExit: 'Leave the demo',
    demoEnter: 'Explore the demo book',
  },
};

export const DOOR_LABELS = {
  shortcut: 'Shortcut',
  gmail: 'Gmail watcher',
  app: 'This app',
};
