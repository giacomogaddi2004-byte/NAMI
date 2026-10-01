import { Icon, ICONS } from '../components/Icon'
import { formatEur, formatEurRounded, formatSigned } from '../lib/money'

const PIGGY = {
  name: 'Computer nuovo',
  color: '#7C4DDB',
  saved: 62500,
  goal: 250000,
  deadline: '31 gennaio 2027',
  monthsLeft: ['novembre', 'dicembre', 'gennaio'],
}

const infoBox = { background: '#F5F2FD', borderRadius: 16, padding: 12 } as const
const infoLabel = { fontSize: 12, fontWeight: 600, color: '#5B4A8A' } as const
const infoValue = { fontSize: 18, fontWeight: 700, marginTop: 2 } as const
const actionBtn = { height: 50, borderRadius: 16, fontSize: 16, fontWeight: 700 } as const

export function Salvadanai() {
  const missing = PIGGY.goal - PIGGY.saved
  const pct = Math.round((PIGGY.saved / PIGGY.goal) * 100)
  const perMonth = Math.ceil(missing / PIGGY.monthsLeft.length)

  return (
    <div className="page">
      <h1>Salvadanai</h1>

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="label">Messi da parte</div>
          <div className="num" style={{ fontSize: 30, fontWeight: 700 }}>{formatEur(PIGGY.saved)}</div>
        </div>
        <div className="muted" style={{ fontSize: 12, textAlign: 'right', maxWidth: 150, lineHeight: 1.4 }}>
          Già tolti dal saldo disponibile in home
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 26, overflow: 'hidden' }}>
        <div style={{ background: PIGGY.color, color: '#fff', padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="cat-icon" style={{ width: 52, height: 52, borderRadius: 17, background: 'rgba(255, 255, 255, 0.18)' }}>
            <Icon d={ICONS.laptop} size={28} color="#FFFFFF" />
          </div>
          <div>
            <div className="num" style={{ fontWeight: 700, fontSize: 21 }}>{PIGGY.name}</div>
            <div style={{ fontSize: 13, color: '#EDE6FF' }}>Obiettivo entro il {PIGGY.deadline}</div>
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="num" style={{ fontSize: 34, fontWeight: 700 }}>{formatEur(PIGGY.saved)}</div>
            <div className="muted">di {formatEur(PIGGY.goal)}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="bar" style={{ height: 12, background: '#EFE8FC' }}>
              <div style={{ width: `${pct}%`, background: PIGGY.color }} />
            </div>
            <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
              <span>{pct}%</span>
              <span>Mancano {formatEur(missing)}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <div style={infoBox}>
              <div style={infoLabel}>Per arrivare in tempo</div>
              <div className="num" style={infoValue}>{formatEurRounded(perMonth)} al mese</div>
              <div className="muted" style={{ fontSize: 12 }}>{PIGGY.monthsLeft.join(', ')}</div>
            </div>
            <div style={infoBox}>
              <div style={infoLabel}>Versamenti</div>
              <div className="num" style={infoValue}>Manuali</div>
              <div className="muted" style={{ fontSize: 12 }}>quando puoi</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <button type="button" style={{ ...actionBtn, border: 0, background: PIGGY.color, color: '#fff' }}>Versa</button>
            <button type="button" style={{ ...actionBtn, border: '1.5px solid #CDBDF3', background: '#fff', color: '#5B35B8' }}>Preleva</button>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="section-title">Storico</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Versamento</div>
                <div className="muted" style={{ fontSize: 12 }}>12 ottobre · dal conto corrente</div>
              </div>
              <div className="tx-amount" style={{ color: 'var(--positive)' }}>{formatSigned(PIGGY.saved)}</div>
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="dashed-btn" style={{ height: 76 }}>
        <Icon d={ICONS.plus} size={22} width={2.4} />
        Nuovo salvadanaio
      </button>
    </div>
  )
}
