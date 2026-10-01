import { useNavigate } from 'react-router-dom'
import { CAT } from '../data/categories'
import { PEOPLE, type Arrival } from '../data/model'
import { useData } from '../data/store'
import { dayOf, shortDay, timeOf } from '../lib/dates'
import { parseShortcutAmount } from '../lib/arrivals'
import { formatEur } from '../lib/money'
import { stableId } from '../lib/ids'
import { categoryFor } from '../lib/rules'
import { Icon, ICONS } from './Icon'

const rowButton = { height: 44, padding: '0 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 } as const

/** Pagamenti Apple Pay in attesa: conferma con un tocco, oppure scorri a sinistra per eliminare. */
export function Arrivals() {
  const navigate = useNavigate()
  const { arrivals, accounts, rules, settings, me, confirmArrival, dismissArrival } = useData()
  if (arrivals.length === 0) return null

  const open = (a: Arrival) => navigate(`/aggiungi?arrivo=${a.id}`)

  const confirm = async (a: Arrival) => {
    const cents = parseShortcutAmount(a.amountRaw)
    const account = accounts.find((x) => x.id === settings?.cards?.[a.card])
    const category = categoryFor(a.merchant, rules)
    if (!cents || !account || !category) return open(a)
    await confirmArrival(a, {
      id: await stableId(`arrival:${a.id}`),
      type: 'uscita',
      cents,
      date: dayOf(a.receivedAt),
      accountId: account.id,
      merchant: a.merchant,
      category,
      who: account.owner === 'entrambi' ? (settings?.people[a.userId] ?? me ?? 'jack') : account.owner,
    })
  }

  return (
    <div style={{ background: '#FFF7E8', border: '1px solid #F3DDB0', borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="cat-icon" style={{ width: 32, height: 32, borderRadius: 10, background: '#fff' }}>
          <Icon d={ICONS.bolt} size={18} color="#9A5B00" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Arrivi da Apple Pay</div>
          <div style={{ fontSize: 12, color: '#6B4A12' }}>
            {arrivals.length === 1 ? '1 da controllare' : `${arrivals.length} da controllare`} · scorri a sinistra per eliminare
          </div>
        </div>
      </div>

      {arrivals.map((a) => {
        const cents = parseShortcutAmount(a.amountRaw)
        const account = accounts.find((x) => x.id === settings?.cards?.[a.card])
        const category = categoryFor(a.merchant, rules)
        const label = !cents ? 'Controlla importo' : !account ? 'Scegli conto' : category ? `${CAT[category].name} · Conferma` : 'Scegli categoria'
        const ready = !!cents && !!account && !!category
        const sender = settings?.people[a.userId]
        return (
          <div key={a.id} className="swipe">
            <div className="swipe-main" style={{ background: '#fff', padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={() => open(a)} style={{ flexGrow: 1, minWidth: 0, border: 0, background: 'transparent', padding: 0, textAlign: 'left', minHeight: 44 }}>
                <div className="tx-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.merchant || 'Esercente sconosciuto'}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {shortDay(dayOf(a.receivedAt))} {timeOf(a.receivedAt)} · {a.card || 'carta sconosciuta'}
                  {account ? ` → ${account.name}` : ''}
                  {sender ? ` · ${PEOPLE[sender].name}` : ''}
                </div>
              </button>
              <div className="tx-side" style={{ gap: 6 }}>
                <div className="tx-amount">{cents ? `−${formatEur(cents)}` : a.amountRaw || '?'}</div>
                <button
                  type="button"
                  onClick={() => void confirm(a)}
                  style={ready ? { ...rowButton, border: 0, background: CAT[category].tint, color: CAT[category].color } : { ...rowButton, border: '1px dashed #B08A3E', background: '#fff', color: '#6B4A12' }}
                >
                  {label}
                </button>
              </div>
            </div>
            <button type="button" className="swipe-delete" onClick={() => void dismissArrival(a)} aria-label={`Elimina l’arrivo ${a.merchant}`}>
              Elimina
            </button>
          </div>
        )
      })}
    </div>
  )
}
