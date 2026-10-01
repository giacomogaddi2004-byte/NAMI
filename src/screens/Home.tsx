import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, ICONS } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { TxRow } from '../components/TxRow'
import { CAT } from '../data/categories'
import { DAYS, SPEND_BY_CATEGORY, SUMMARY, TODAY_LABEL } from '../data/mock'
import { formatEur, formatEurRounded } from '../lib/money'

const VIEWS = [['jack', 'Jack'], ['fiore', 'Fiore'], ['coppia', 'Coppia']] as const
type View = (typeof VIEWS)[number][0]

const WAVE = 'c19 0 19-18 38-18s19 18 38 18 19-18 38-18 19 18 38 18 19-18 38-18 19 18 38 18'
const R = 52
const C = 2 * Math.PI * R
const LEGEND_TOP = 5

export function Home() {
  const [view, setView] = useState<View>('coppia')

  const spent = SPEND_BY_CATEGORY.reduce((a, [, c]) => a + c, 0)
  const budgetPct = Math.round((spent / SUMMARY.budgetTotal) * 100)
  const savings = SUMMARY.inPiggyBanks + SUMMARY.deposit

  let cum = 0
  const segments = SPEND_BY_CATEGORY.map(([cat, cents]) => {
    const len = (cents / spent) * C
    const seg = { cat, dash: `${Math.max(len - 2, 0).toFixed(2)} ${C.toFixed(2)}`, offset: (-cum).toFixed(2) }
    cum += len
    return seg
  })
  const others = SPEND_BY_CATEGORY.slice(LEGEND_TOP)
  const legend = [
    ...SPEND_BY_CATEGORY.slice(0, LEGEND_TOP).map(([cat, cents]) => ({ name: CAT[cat].name, color: CAT[cat].color, cents })),
    { name: `Altre ${others.length}`, color: '#B8BDCC', cents: others.reduce((a, [, c]) => a + c, 0) },
  ]

  const latest = DAYS.flatMap((d) => d.rows.map((tx) => ({ tx, meta: `${d.short} · ${tx.account}` }))).slice(0, 5)

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="cat-icon" style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--primary)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 10c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" />
              <path d="M2 16c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" />
            </svg>
          </div>
          <div>
            <div className="num" style={{ fontWeight: 700, fontSize: 21, letterSpacing: '0.06em' }}>NAMI</div>
            <div className="muted" style={{ fontSize: 13 }}>{TODAY_LABEL}</div>
          </div>
        </div>
        <Link
          to="/impostazioni"
          aria-label="Impostazioni"
          className="cat-icon"
          style={{ width: 44, height: 44, borderRadius: 22, background: '#fff', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <Icon d={ICONS.settings} size={22} />
        </Link>
      </div>

      <Segmented options={VIEWS} value={view} onChange={setView} />

      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--primary)', borderRadius: 26, padding: '24px 22px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <svg width="230" height="96" viewBox="0 0 230 96" fill="none" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="3" strokeLinecap="round" aria-hidden="true" style={{ position: 'absolute', right: -18, bottom: -14 }}>
          <path d={`M0 40${WAVE}`} />
          <path d={`M0 64${WAVE}`} />
          <path d={`M0 88${WAVE}`} />
        </svg>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#DCE3FF' }}>Saldo disponibile</div>
        <div className="num" style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {formatEur(SUMMARY.available)}
        </div>
        <div style={{ fontSize: 13, color: '#DCE3FF', maxWidth: 230, lineHeight: 1.4 }}>
          Conti e contanti, meno {formatEur(SUMMARY.inPiggyBanks)} messi nei salvadanai
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="label">Speso a ottobre</div>
          <div className="num" style={{ fontSize: 25, fontWeight: 700 }}>{formatEur(spent)}</div>
          <div className="bar" style={{ height: 8 }}>
            <div style={{ width: `${Math.min(budgetPct, 100)}%`, background: 'var(--plus)' }} />
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {budgetPct}% di {formatEurRounded(SUMMARY.budgetTotal)} di budget
          </div>
        </div>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="label">Totale risparmi</div>
          <div className="num" style={{ fontSize: 25, fontWeight: 700, color: 'var(--positive)' }}>{formatEur(savings)}</div>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
            Salvadanai {formatEur(SUMMARY.inPiggyBanks)}
            <br />
            Conto deposito {formatEur(SUMMARY.deposit)}
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row-between">
          <div className="card-title">Spese per categoria</div>
          <Link to="/statistiche" className="link">Dettagli</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
            <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
              <g transform="rotate(-90 66 66)" fill="none" strokeWidth="18">
                <circle cx="66" cy="66" r={R} stroke="#ECEEF3" />
                {segments.map((s) => (
                  <circle key={s.cat} cx="66" cy="66" r={R} stroke={CAT[s.cat].color} strokeDasharray={s.dash} strokeDashoffset={s.offset} />
                ))}
              </g>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>Totale</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 17 }}>{formatEurRounded(spent)}</div>
            </div>
          </div>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
            {legend.map((l) => (
              <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, flexShrink: 0 }} />
                <span style={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatEur(l.cents)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '18px 18px 8px' }}>
        <div className="row-between" style={{ paddingBottom: 6 }}>
          <div className="card-title">Ultimi movimenti</div>
          <Link to="/movimenti" className="link">Vedi tutti</Link>
        </div>
        {latest.map(({ tx, meta }) => (
          <TxRow key={tx.name} tx={tx} meta={meta} />
        ))}
      </div>
    </div>
  )
}
