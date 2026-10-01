import { useState } from 'react'
import { Icon, ICONS } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { TxRow } from '../components/TxRow'
import { CAT } from '../data/categories'
import { DAYS, type MockTx } from '../data/mock'
import { formatEur, formatSigned } from '../lib/money'

const FILTERS = [['tutti', 'Tutti'], ['uscite', 'Uscite'], ['entrate', 'Entrate'], ['fisse', 'Fisse']] as const
type Filter = (typeof FILTERS)[number][0]

const KEEP: Record<Filter, (tx: MockTx) => boolean> = {
  tutti: () => true,
  uscite: (tx) => tx.cents < 0,
  entrate: (tx) => tx.cents > 0,
  fisse: (tx) => tx.tag === 'Fissa',
}

const inboxCard = { background: '#fff', borderRadius: 16, padding: 12, display: 'flex', alignItems: 'center', gap: 10 } as const
const inboxBtn = { height: 44, padding: '0 12px', borderRadius: 12, fontSize: 12, fontWeight: 700 } as const

export function Movimenti() {
  const [filter, setFilter] = useState<Filter>('tutti')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const matches = (tx: MockTx) =>
    !q || [tx.name, CAT[tx.cat].name, tx.account, formatEur(tx.cents)].some((s) => s.toLowerCase().includes(q))

  const groups = DAYS.map((d) => {
    const rows = d.rows.filter((tx) => KEEP[filter](tx) && matches(tx))
    return { title: d.title, rows, total: rows.reduce((a, tx) => a + tx.cents, 0) }
  }).filter((g) => g.rows.length > 0)

  return (
    <div className="page">
      <h1>Movimenti</h1>

      <div style={{ height: 48, borderRadius: 16, background: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
        <Icon d={ICONS.search} size={20} color="#5B6178" />
        <input
          type="search"
          aria-label="Cerca nei movimenti"
          placeholder="Cerca esercente, nota, importo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flexGrow: 1, border: 0, background: 'transparent', fontSize: 16, height: 44 }}
        />
      </div>

      <Segmented options={FILTERS} value={filter} onChange={setFilter} className="chips" />

      <div style={{ background: '#FFF7E8', border: '1px solid #F3DDB0', borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="cat-icon" style={{ width: 32, height: 32, borderRadius: 10, background: '#fff' }}>
            <Icon d={ICONS.bolt} size={18} color="#9A5B00" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Arrivi da Apple Pay</div>
            <div style={{ fontSize: 12, color: '#6B4A12' }}>2 da controllare · scorri a sinistra per eliminare</div>
          </div>
        </div>
        <div style={inboxCard}>
          <div className="tx-main">
            <div className="tx-name">Farmacia Comunale</div>
            <div className="muted" style={{ fontSize: 12 }}>Oggi 11:42 · carta del conto corrente</div>
          </div>
          <div className="tx-side" style={{ gap: 6 }}>
            <div className="tx-amount">−12,90 €</div>
            <button type="button" style={{ ...inboxBtn, border: 0, background: '#FCE6E6', color: '#A32020' }}>Salute · Conferma</button>
          </div>
        </div>
        <div style={inboxCard}>
          <div className="tx-main">
            <div className="tx-name">Libreria Rinascita</div>
            <div className="muted" style={{ fontSize: 12 }}>Ieri 18:05 · esercente nuovo</div>
          </div>
          <div className="tx-side" style={{ gap: 6 }}>
            <div className="tx-amount">−18,50 €</div>
            <button type="button" style={{ ...inboxBtn, border: '1px dashed #B08A3E', background: '#fff', color: '#6B4A12' }}>Scegli categoria</button>
          </div>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.title} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="row-between" style={{ padding: '4px 4px 0' }}>
            <div className="section-title">{g.title}</div>
            <div className="label" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatSigned(g.total)}</div>
          </div>
          <div className="card" style={{ padding: '4px 16px' }}>
            {g.rows.map((tx) => (
              <TxRow key={tx.name} tx={tx} meta={`${CAT[tx.cat].name} · ${tx.account}`} />
            ))}
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <div className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>Nessun movimento trovato</div>
      )}
    </div>
  )
}
