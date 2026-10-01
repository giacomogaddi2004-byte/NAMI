import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CatIcon, Icon, ICONS } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { CAT } from '../data/categories'
import { PEOPLE, type View } from '../data/model'
import { useData } from '../data/store'
import { monthEnd, monthsBack, level, nextMonth, prevMonth, savingsAt, spentByCategory } from '../lib/budget'
import { monthSummary } from '../lib/balances'
import { monthName, today } from '../lib/dates'
import { formatEur, formatEurRounded, formatSigned } from '../lib/money'
import { useView } from '../lib/view'

const VIEWS = [['jack', PEOPLE.jack.name], ['fiore', PEOPLE.fiore.name], ['coppia', 'Coppia']] as const

const BAR_MAX_PX = 150
const sixCols = { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 } as const
const arrowBtn = { width: 44, height: 44, border: 0, borderRadius: 12, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const month1 = (month: string) => `${month}-01`
const shortMonth = (month: string) => capitalize(monthName(month1(month))).slice(0, 3)
const longMonth = (month: string) => `${capitalize(monthName(month1(month)))} ${month.slice(0, 4)}`
const money = (cents: number) => (cents < 0 ? '−' : '') + formatEur(cents)

/** Colonne di un grafico a barre: ultime 6 voci, l'ultima evidenziata. */
function Bars({ items, fill, highlight }: { items: { label: string; cents: number }[]; fill: string; highlight: string }) {
  const max = Math.max(1, ...items.map((i) => i.cents))
  return (
    <>
      <div style={{ ...sixCols, height: 190, alignItems: 'end', borderBottom: '1px solid var(--border)' }}>
        {items.map((it, i) => {
          const last = i === items.length - 1
          return (
            <div key={it.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: 190 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: last ? 'var(--primary)' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                {formatEurRounded(it.cents).replace(' €', '')}
              </div>
              <div style={{ width: '100%', height: Math.max(2, Math.round((Math.max(it.cents, 0) / max) * BAR_MAX_PX)), borderRadius: '8px 8px 0 0', background: last ? highlight : fill }} />
            </div>
          )
        })}
      </div>
      <div style={{ ...sixCols, marginTop: -6 }}>
        {items.map((it) => (
          <div key={it.label} className="muted" style={{ textAlign: 'center', fontSize: 12, fontWeight: 600 }}>{it.label}</div>
        ))}
      </div>
    </>
  )
}

export function Statistiche() {
  const { accounts, txs, piggyMoves, budgets } = useData()
  const [view, setView] = useView()
  const current = today().slice(0, 7)
  const [month, setMonth] = useState(current)

  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const firstMonth = txs.reduce((min, t) => (t.date.slice(0, 7) < min ? t.date.slice(0, 7) : min), current)
  const months = monthsBack(month, 6)

  const summary = monthSummary(txs, month, byId, view)
  const before = monthSummary(txs, prevMonth(month), byId, view)
  const bars = months.map((m) => ({ label: shortMonth(m), cents: monthSummary(txs, m, byId, view).spent }))
  const peak = bars.reduce((best, b) => (b.cents > best.cents ? b : best), bars[0])
  const prevName = monthName(month1(prevMonth(month)))
  const change = before.spent > 0 ? Math.round(((summary.spent - before.spent) / before.spent) * 100) : null

  const savings = months.map((m) => ({ label: shortMonth(m), cents: savingsAt(accounts, txs, piggyMoves, monthEnd(m), view) }))
  const savingsNow = savings[savings.length - 1].cents
  const savingsGrowth = savingsNow - savingsAt(accounts, txs, piggyMoves, monthEnd(prevMonth(month)), view)

  // I budget sono della coppia: si confrontano sempre con la spesa di tutti e due.
  const spentCats = spentByCategory(txs, month, byId)
  const budgeted = budgets.slice().sort((a, b) => (spentCats.get(b.category) ?? 0) / b.limit - (spentCats.get(a.category) ?? 0) / a.limit)
  const unbudgeted = [...spentCats].filter(([cat]) => !budgets.some((b) => b.category === cat))

  const totals = [
    { label: 'Entrate', value: formatEur(summary.income), color: 'var(--positive)' },
    { label: 'Uscite', value: formatEur(summary.spent), color: 'var(--text)' },
    { label: 'Differenza', value: formatSigned(summary.income - summary.spent), color: summary.income >= summary.spent ? 'var(--primary)' : 'var(--over)' },
  ]

  return (
    <div className="page">
      <h1>Statistiche</h1>

      <Segmented<View> options={VIEWS} value={view} onChange={setView} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 16, padding: 4 }}>
        <button type="button" aria-label="Mese precedente" disabled={month <= firstMonth} onClick={() => setMonth(prevMonth(month))} style={arrowBtn}>
          <Icon d={ICONS.left} size={20} width={2.2} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{longMonth(month)}</div>
        <button type="button" aria-label="Mese successivo" disabled={month >= current} onClick={() => setMonth(nextMonth(month))} style={arrowBtn}>
          <Icon d={ICONS.right} size={20} width={2.2} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {totals.map((t) => (
          <div key={t.label} style={{ background: '#fff', borderRadius: 18, padding: 12 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 700, color: t.color, whiteSpace: 'nowrap' }}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="card-title">Spese degli ultimi 6 mesi</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {change === null
              ? `Mese più alto: ${peak.cents > 0 ? `${peak.label.toLowerCase()} (${formatEurRounded(peak.cents)})` : 'nessuna spesa ancora'}`
              : `${longMonth(month).split(' ')[0]}: ${change === 0 ? 'come' : `${change > 0 ? '+' : '−'}${Math.abs(change)}% rispetto ${/^[aeiou]/.test(prevName) ? 'ad' : 'a'}`} ${prevName}${month === current ? ' (mese in corso)' : ''}`}
          </div>
        </div>
        <Bars items={bars} fill="#C9D3F7" highlight="var(--primary)" />
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="card-title">Crescita dei risparmi</div>
          <div className="muted" style={{ fontSize: 13 }}>Conto deposito e salvadanai a fine mese</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div className="num" style={{ fontSize: 28, fontWeight: 700, whiteSpace: 'nowrap' }}>{money(savingsNow)}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: savingsGrowth >= 0 ? 'var(--positive)' : 'var(--over)' }}>
            {formatSigned(savingsGrowth)} nel mese
          </div>
        </div>
        <Bars items={savings} fill="#BFE5CF" highlight="var(--positive)" />
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="row-between">
          <div className="card-title">Budget di {monthName(month1(month))}</div>
          <Link to="/budget" className="link" style={{ display: 'flex', alignItems: 'center', height: 44 }}>
            {budgets.length > 0 ? 'Modifica' : 'Imposta'}
          </Link>
        </div>
        {budgets.length === 0 && (
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>
            Scegli quanto spendere al mese per categoria: NAMI ti avvisa quando arrivi all'80% e al 100%.
          </div>
        )}
        {view !== 'coppia' && budgets.length > 0 && (
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>I budget sono di coppia: qui conta la spesa di tutti e due.</div>
        )}
        {budgeted.map((b) => {
          const spent = spentCats.get(b.category) ?? 0
          const lv = level(spent, b.limit)
          const color = CAT[b.category].color
          return (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="row-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                  {CAT[b.category].name}
                </div>
                <div className="muted" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatEur(spent)}</span> / {formatEur(b.limit)}
                </div>
              </div>
              <div className="bar" style={{ height: 10 }}>
                <div style={{ width: `${Math.min(100, Math.round((spent / b.limit) * 100))}%`, background: lv === 'over' ? 'var(--over)' : lv === 'near' ? 'var(--warning)' : color }} />
              </div>
              {lv !== 'ok' && (
                <div style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '3px 8px', color: lv === 'over' ? '#A32020' : '#8A4B00', background: lv === 'over' ? '#FCE6E6' : '#FFF1D6' }}>
                  {lv === 'over' ? (spent === b.limit ? 'Budget raggiunto' : `Oltre il budget di ${formatEur(spent - b.limit)}`) : 'Oltre l’80% del budget'}
                </div>
              )}
            </div>
          )
        })}
        {unbudgeted.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: budgeted.length > 0 ? '1px solid var(--line)' : undefined, paddingTop: budgeted.length > 0 ? 12 : 0 }}>
            {budgeted.length > 0 && <div className="section-title" style={{ marginBottom: 4 }}>Senza budget</div>}
            {unbudgeted.map(([cat, cents]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
                <CatIcon cat={cat} box={32} radius={10} icon={18} />
                <span style={{ flexGrow: 1, fontWeight: 600, fontSize: 14 }}>{CAT[cat].name}</span>
                <span className="num" style={{ fontWeight: 600, fontSize: 15 }}>{formatEur(cents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
