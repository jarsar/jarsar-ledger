import { useEffect, useMemo, useRef } from 'react';
import Screen from '../../components/Screen';
import PaceMark from '../../components/PaceMark';
import Chip from '../../components/Chip';
import PaceBar from '../../components/PaceBar';
import HomeChart from '../../components/charts/HomeChart';
import TrendBars from '../../components/charts/TrendBars';
import { AmountDisplay, SegmentedToggle, StatusDot } from '../../components/Bits';
import { useLedger } from '../../state/LedgerContext';
import {
  buildMonthModel,
  heroSeries,
  trendSeries,
  topVendors,
  docketOf,
  settledCategories,
  questionedCategories,
} from '../../lib/selectors';
import { radarSignals } from '../../lib/radar';
import { monthLabel, monthName, shiftMonth, pesoFlat, pesoRound, daysInMonthOf } from '../../lib/format';
import { COPY } from '../../lib/copy';
import { navigate } from '../../router';
import './Home.css';

const BAR_COLOR = {
  teal: 'var(--teal)',
  coral: 'var(--coral)',
  settled: 'rgba(38,75,83,.35)',
};

export default function Home({ focus }) {
  const { today, budgets, rowsOf, monthTotals, selectedMonth, setSelectedMonth, allRows, dismissed } =
    useLedger();
  const scrollRef = useRef(null);

  const prevMonth = shiftMonth(today.month, -1);
  const month = selectedMonth || today.month;

  const model = useMemo(
    () => buildMonthModel(rowsOf(month), budgets, today, month, rowsOf(shiftMonth(month, -1))),
    [rowsOf, budgets, today, month]
  );

  const series = useMemo(() => heroSeries(model), [model]);
  const trend = useMemo(() => trendSeries(monthTotals, today.month), [monthTotals, today.month]);
  const settled = useMemo(() => settledCategories(model), [model]);
  const vendors = useMemo(() => topVendors(model.rows, 5, settled), [model.rows, settled]);
  const docketCount = useMemo(() => docketOf(allRows).length, [allRows]);
  const questioned = useMemo(() => {
    const history = allRows.filter((r) => r.month < today.month);
    return questionedCategories(radarSignals(model, history, today, dismissed));
  }, [model, allRows, today, dismissed]);

  // Radar sends you here pointing at a category; the card says which one.
  useEffect(() => {
    if (!focus) return;
    const el = scrollRef.current?.querySelector(`[data-category="${CSS.escape(focus)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('budgetrow--focus');
    const t = setTimeout(() => el.classList.remove('budgetrow--focus'), 2200);
    return () => clearTimeout(t);
  }, [focus, model]);

  const boardDays = Math.max(0, daysInMonthOf(today.month) - today.day + 1);

  return (
    <Screen variant="room" scroll={false}>
      <div className="home__head">
        <div className="home__brand">
          <PaceMark size={30} glass />
          <span className="home__wordmark">{COPY.brand}</span>
        </div>
        <SegmentedToggle
          value={month}
          onChange={setSelectedMonth}
          options={[
            { value: prevMonth, label: monthLabel(prevMonth) },
            { value: today.month, label: monthLabel(today.month) },
          ]}
        />
      </div>

      <div className="home__hero">
        <AmountDisplay value={model.monthTotal} size={40} />
        <div className="home__pill">
          <span className="home__pilldot" />
          <span className="home__pilltext">
            {model.pctDrawn.toFixed(1)}% drawn ·{' '}
            {model.closed ? 'closed & certified' : `day ${model.day} of ${model.daysInMonth}`}
          </span>
        </div>
      </div>

      <HomeChart series={series} closed={model.closed} />

      <div className="home__sheet" ref={scrollRef}>
        {model.closed && (
          <div className="home__closed">
            <StatusDot tone="mint" size={7} />
            <span>{COPY.home.closed}</span>
          </div>
        )}

        <div className="home__sectionhead">
          <span className="home__sectiontitle">{COPY.home.budgets}</span>
          <span className="mono home__sectionnote">
            {model.closed ? 'MONTH CLOSED' : `DAY ${model.day} OF ${model.daysInMonth}`}
          </span>
        </div>

        {model.groups.map((g) => (
          <div key={g.name} className="home__group">
            <div className="home__grouphead">
              <span className="home__groupname">{g.name}</span>
              <span className="mono home__groupsum">
                {pesoFlat(g.subtotal)} / {pesoRound(g.cap).replace('₱', '')}
              </span>
            </div>
            <div className="home__rows">
              {g.categories.map((c) => (
                <BudgetRow key={c.category} cat={c} model={model} />
              ))}
            </div>
          </div>
        ))}

        {model.funds.length > 0 && (
          <>
            <div className="home__grouphead home__grouphead--spaced">
              <span className="home__groupname">{COPY.home.funds}</span>
              <span className="mono home__fundnote">{COPY.home.fundsNote}</span>
            </div>
            <div className="home__funds">
              {model.funds.map((f) => (
                <div key={f.category} className="home__fund">
                  <div className="home__fundname">{f.category}</div>
                  <div className="mono home__fundamt">{f.spent > 0 ? pesoRound(f.spent) : '—'}</div>
                  <div className={`mono home__fundtag${f.spent > 0 ? ' home__fundtag--drawn' : ''}`}>
                    {f.spent > 0 ? COPY.home.fundsThisMonth : COPY.home.fundsQuiet}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="card home__card">
          <div className="home__cardhead">
            <span className="home__cardtitle">{COPY.home.sixMonths}</span>
            <span className="mono home__cardnote">₱K · {monthLabel(today.month)} HATCHED</span>
          </div>
          <TrendBars series={trend} />
        </div>

        <div className="card home__card">
          <div className="home__cardhead">
            <span className="home__cardtitle">{COPY.home.counterparties}</span>
            <span className="mono home__cardnote">{model.closed ? monthLabel(month) : 'MTD'}</span>
          </div>
          {vendors.map((v) => (
            <div key={v.vendor} className="home__vendor">
              <span className="truncate home__vendorname">{v.vendor}</span>
              <span className="mono home__vendorct">{v.count}×</span>
              <span className="mono home__vendoramt">{pesoFlat(v.sum)}</span>
            </div>
          ))}
          {!vendors.length && <div className="home__vendorempty">No counterparties this month.</div>}
        </div>

        <button className="home__board" onClick={() => navigate('/review')}>
          <div className="home__boardhead">
            <span className="home__boarddot" />
            <span className="mono home__boardlabel">{COPY.home.boardTitle}</span>
          </div>
          <p className="home__boardbody">
            {COPY.home.board({
              month: monthName(today.month),
              days: boardDays,
              docket: docketCount,
              worst: questioned,
            })}
          </p>
          <div className="home__boardaction">{COPY.home.boardAction}</div>
        </button>
      </div>
    </Screen>
  );
}

function BudgetRow({ cat, model }) {
  const { chip } = cat;
  const tick = model.closed || cat.cap == null ? null : (model.day / model.daysInMonth) * 100;

  return (
    <div className="card budgetrow" data-category={cat.category}>
      <div className="budgetrow__head">
        <span className="budgetrow__name">{cat.category}</span>
        <Chip text={chip.text} kind={chip.kind} />
      </div>

      {chip.bar === 'none' ? (
        <div className="budgetrow__nocap" />
      ) : (
        <PaceBar pct={chip.pct} color={BAR_COLOR[chip.bar] || BAR_COLOR.teal} tickPct={tick} />
      )}

      <div className="mono budgetrow__figures">
        {pesoFlat(cat.spent)} / {cat.cap == null ? '—' : pesoRound(cat.cap).replace('₱', '')}
      </div>
    </div>
  );
}
