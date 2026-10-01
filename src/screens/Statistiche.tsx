import { Icon, ICONS } from '../components/Icon'
import { CAT } from '../data/categories'
import { BUDGETS, MONTHS, SUMMARY } from '../data/mock'
import { formatEur, formatEurRounded, formatSigned } from '../lib/money'

const BAR_MAX_PX = 150
const sixCols = { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 } as const
const arrowBtn = { width: 44, height: 44, border: 0, borderRadius: 12, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const

export function Statistiche() {
  const spent = MONTHS[MONTHS.length - 1][1]
  const max = Math.max(...MONTHS.map(([, c]) => c))

  const totals = [
    { label: 'Entrate', value: formatEur(SUMMARY.income), color: 'var(--positive)' },
    { label: 'Uscite', value: formatEur(spent), color: 'var(--text)' },
    { label: 'Differenza', value: formatSigned(SUMMARY.income - spent), color: 'var(--primary)' },
  ]

  return (
    <div className="page">
      <h1>Statistiche</h1>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 16, padding: 4 }}>
        <button type="button" aria-label="Mese precedente" style={arrowBtn}>
          <Icon d={ICONS.left} size={20} width={2.2} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Ottobre 2026</div>
        <button type="button" aria-label="Mese successivo" style={arrowBtn}>
          <Icon d={ICONS.right} size={20} width={2.2} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {totals.map((t) => (
          <div key={t.label} style={{ background: '#fff', borderRadius: 18, padding: 12 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div>
            <div className="num" style={{ fontSize: 17, fontWeight: 700, color: t.color, whiteSpace: 'nowrap' }}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="card-title">Spese degli ultimi 6 mesi</div>
          <div className="muted" style={{ fontSize: 13 }}>Ottobre è a metà: il mese di punta resta agosto</div>
        </div>
        <div style={{ ...sixCols, height: 190, alignItems: 'end', borderBottom: '1px solid var(--border)' }}>
          {MONTHS.map(([month, cents], i) => {
            const last = i === MONTHS.length - 1
            return (
              <div key={month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: 190 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: last ? 'var(--primary)' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatEurRounded(cents).replace(' €', '')}
                </div>
                <div style={{ width: '100%', height: Math.round((cents / max) * BAR_MAX_PX), borderRadius: '8px 8px 0 0', background: last ? 'var(--primary)' : '#C9D3F7' }} />
              </div>
            )
          })}
        </div>
        <div style={{ ...sixCols, marginTop: -6 }}>
          {MONTHS.map(([month]) => (
            <div key={month} className="muted" style={{ textAlign: 'center', fontSize: 12, fontWeight: 600 }}>{month}</div>
          ))}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="row-between">
          <div className="card-title">Budget di ottobre</div>
          <button type="button" className="link" style={{ height: 44, border: 0, background: 'transparent', padding: 0 }}>Modifica</button>
        </div>
        {BUDGETS.map((b) => {
          const pct = b.spent / b.limit
          const over = pct >= 1
          const near = pct >= 0.8 && !over
          const color = CAT[b.cat].color
          return (
            <div key={b.cat} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="row-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                  {CAT[b.cat].name}
                </div>
                <div className="muted" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatEur(b.spent)}</span> / {formatEur(b.limit)}
                </div>
              </div>
              <div className="bar" style={{ height: 10 }}>
                <div style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, background: over ? 'var(--over)' : near ? 'var(--warning)' : color }} />
              </div>
              {(over || near) && (
                <div style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '3px 8px', color: over ? '#A32020' : '#8A4B00', background: over ? '#FCE6E6' : '#FFF1D6' }}>
                  {over ? `Oltre il budget di ${formatEur(b.spent - b.limit)}` : 'Oltre l’80% del budget'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
