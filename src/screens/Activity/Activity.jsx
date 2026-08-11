import { useMemo, useState } from 'react';
import Screen, { ScreenTop, ScreenBody } from '../../components/Screen';
import Monogram from '../../components/Monogram';
import { EmptyState, FilterChip } from '../../components/Bits';
import { SearchIcon } from '../../components/Icons';
import QuickAmendSheet from './QuickAmendSheet';
import { useLedger } from '../../state/LedgerContext';
import { groupByDay, docketOf } from '../../lib/selectors';
import { pesoFlat, pesoK, dayLabel, monthLabel } from '../../lib/format';
import { COPY } from '../../lib/copy';
import { navigate } from '../../router';
import './Activity.css';

const DOOR = { shortcut: 'SC', gmail: 'GM', app: 'APP', console: 'CON', test: 'TEST' };

export default function Activity({ query }) {
  const { today, allRows, rowsOf, selectedMonth } = useLedger();
  const [search, setSearch] = useState(query || '');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);

  const month = selectedMonth || today.month;
  const monthRows = rowsOf(month);

  const rows = useMemo(() => {
    const pool = search ? allRows : monthRows;
    const q = search.trim().toLowerCase();
    return pool.filter((r) => {
      if (filter === 'cash' && r.paid_via !== 'Cash') return false;
      if (!q) return true;
      return [r.vendor, r.item, r.category, String(r.amount), r.paid_via]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [allRows, monthRows, search, filter]);

  const days = useMemo(() => groupByDay(rows, today), [rows, today]);
  const docketCount = useMemo(() => docketOf(allRows).length, [allRows]);
  const monthTotal = monthRows.reduce((a, r) => a + (Number(r.amount) || 0), 0);

  return (
    <Screen variant="fog" scroll={false}>
      <ScreenTop tone="room" className="activity__top">
        <div className="activity__title">
          <span className="activity__heading">{COPY.activity.title}</span>
          <span className="mono activity__tally">
            {monthRows.length} · {pesoK(monthTotal)} {month === today.month ? 'MTD' : monthLabel(month)}
          </span>
        </div>

        <label className="activity__search">
          <SearchIcon />
          <input
            className="activity__searchinput"
            type="search"
            placeholder={COPY.activity.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className="activity__filters">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterChip>
          <FilterChip tone="amber" onClick={() => navigate('/review')}>
            Review · {docketCount}
          </FilterChip>
          <FilterChip active={filter === 'cash'} onClick={() => setFilter(filter === 'cash' ? 'all' : 'cash')}>
            Cash
          </FilterChip>
        </div>
      </ScreenTop>

      <ScreenBody dock className="activity__body">
        {days.length === 0 ? (
          <EmptyState
            title={search ? 'Nothing matches' : COPY.activity.empty}
            body={search ? 'No entry in the book answers to that.' : COPY.activity.emptyBody}
            tag={search ? null : COPY.activity.emptyTag}
          />
        ) : (
          <>
            {days.map((d) => (
              <section key={d.date} className="activity__day">
                <div className="activity__dayhead">
                  <span className="activity__daylabel">{d.label || dayLabel(d.date)}</span>
                  <span className="mono activity__daytotal">{pesoFlat(d.total)}</span>
                </div>
                <div className="activity__card">
                  {d.rows.map((r) => (
                    <EntryRow key={r.id} row={r} onOpen={() => setOpen(r)} />
                  ))}
                </div>
              </section>
            ))}
            <div className="mono activity__tape">
              {month === today.month ? 'ALL DOORS SYNCED' : `${monthLabel(month)} · CLOSED`}
            </div>
          </>
        )}
      </ScreenBody>

      <QuickAmendSheet row={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

function EntryRow({ row, onOpen }) {
  const flagged = row.review === 'check';
  return (
    <button className={`entryrow${flagged ? ' entryrow--flagged' : ''}`} onClick={onOpen}>
      <Monogram vendor={row.vendor} />
      <div className="entryrow__mid">
        <div className="truncate entryrow__vendor">{row.vendor}</div>
        <div className="truncate entryrow__meta">
          {row.item}
          {row.time ? ` · ${row.time}` : ''}
        </div>
      </div>
      <div className="entryrow__right">
        <div className="mono entryrow__amt">
          {pesoFlat(row.amount)}
          {flagged ? '?' : ''}
        </div>
        <div className="mono entryrow__door">
          {row.paid_via || '—'} · {DOOR[row.source] || (row.source || '?').toUpperCase()}
        </div>
      </div>
    </button>
  );
}
