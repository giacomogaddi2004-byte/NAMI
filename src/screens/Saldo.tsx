import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon, ICONS } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { OWNER_LABEL, PEOPLE, type View } from '../data/model'
import { useData } from '../data/store'
import { computeShares, countsInAvailable, isSplit, viewAmount } from '../lib/balances'
import { formatEur } from '../lib/money'
import { piggyAmount } from '../lib/piggy'

const VIEWS = [['jack', PEOPLE.jack.name], ['fiore', PEOPLE.fiore.name], ['coppia', 'Coppia']] as const
const COLORS = ['#2B50E0', '#0E8A7F', '#E8553A', '#E08A00', '#7C4DDB', '#C93582']

const R = 70
const C = 2 * Math.PI * R

const money = (cents: number) => (cents < 0 ? '−' : '') + formatEur(cents)

/** Da cosa è composto il saldo disponibile: un conto per fetta. */
export function Saldo() {
  const navigate = useNavigate()
  const params = useParams()
  const view: View = params.view === 'jack' || params.view === 'fiore' ? params.view : 'coppia'
  const { accounts, txs, piggyMoves } = useData()
  const shares = useMemo(() => computeShares(accounts, txs), [accounts, txs])

  // Per una persona: i suoi conti, più la sua quota dei conti di entrambi.
  // Il colore si assegna prima di filtrare, così ogni conto tiene il suo in tutte le viste.
  const rows = accounts
    .filter(countsInAvailable)
    .map((a, i) => ({ account: a, cents: viewAmount(shares.get(a.id)!, view), color: COLORS[i % COLORS.length] }))
    .filter((r) => view === 'coppia' || r.account.owner === view || isSplit(r.account))
  const piggy = piggyAmount(piggyMoves, view)
  const total = rows.reduce((sum, r) => sum + r.cents, 0) - piggy
  const positive = rows.reduce((sum, r) => sum + Math.max(r.cents, 0), 0)

  let cum = 0
  const segments = rows
    .filter((r) => r.cents > 0)
    .map((r) => {
      const len = (r.cents / positive) * C
      const seg = { id: r.account.id, color: r.color, dash: `${Math.max(len - 3, 0).toFixed(2)} ${C.toFixed(2)}`, offset: (-cum).toFixed(2) }
      cum += len
      return seg
    })

  return (
    <div className="page page--plain">
      <button type="button" className="back" onClick={() => navigate('/')} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--primary)' }}>
        <Icon d={ICONS.left} size={20} width={2.2} />
        Home
      </button>
      <h1>Saldo disponibile</h1>

      <Segmented options={VIEWS} value={view} onChange={(v) => navigate(`/saldo/${v}`, { replace: true })} />

      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 18px' }}>
        <div style={{ position: 'relative', width: 190, height: 190 }}>
          <svg width="190" height="190" viewBox="0 0 190 190" aria-hidden="true">
            <g transform="rotate(-90 95 95)" fill="none" strokeWidth="24">
              <circle cx="95" cy="95" r={R} stroke="#ECEEF3" />
              {segments.map((s) => (
                <circle key={s.id} cx="95" cy="95" r={R} stroke={s.color} strokeDasharray={s.dash} strokeDashoffset={s.offset} />
              ))}
            </g>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{view === 'coppia' ? 'Coppia' : PEOPLE[view].name}</div>
            <div className="num" style={{ fontWeight: 700, fontSize: total >= 1000000 ? 17 : 20, whiteSpace: 'nowrap' }}>{money(total)}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '4px 16px' }}>
        {rows.map((r) => (
          <Link key={r.account.id} to={`/conto/${r.account.id}`} className="tx" style={{ color: 'inherit' }}>
            <span style={{ width: 14, height: 14, borderRadius: 5, background: r.color, flexShrink: 0 }} />
            <div className="tx-main">
              <div className="tx-name">{r.account.name}</div>
              <div className="tx-meta">
                {view !== 'coppia' && isSplit(r.account) ? `Quota di ${PEOPLE[view].name}` : OWNER_LABEL[r.account.owner]}
                {r.cents > 0 && positive > 0 && ` · ${Math.round((r.cents / positive) * 100)}%`}
              </div>
            </div>
            <div className="tx-amount" style={{ color: r.cents < 0 ? 'var(--over)' : 'var(--text)' }}>{money(r.cents)}</div>
            <Icon d={ICONS.right} size={18} color="#8A90A6" width={2.2} />
          </Link>
        ))}
      </div>

      {piggy !== 0 && (
        <Link to="/salvadanai" className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', color: 'inherit' }}>
          <span style={{ width: 14, height: 14, borderRadius: 5, background: '#B8BDCC', flexShrink: 0 }} />
          <div style={{ flexGrow: 1 }}>
            <div className="tx-name">Messi nei salvadanai</div>
            <div className="tx-meta">Restano sui conti ma non sono disponibili</div>
          </div>
          <div className="tx-amount">{money(-piggy)}</div>
          <Icon d={ICONS.right} size={18} color="#8A90A6" width={2.2} />
        </Link>
      )}

      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45, padding: '0 4px' }}>
        Il saldo disponibile somma conti correnti e contanti, meno i soldi nei salvadanai. Conto deposito e conto tasse restano fuori.
        {rows.some((r) => r.cents < 0) && ' I conti in rosso non compaiono nel grafico ma abbassano il totale.'}
      </div>
    </div>
  )
}
