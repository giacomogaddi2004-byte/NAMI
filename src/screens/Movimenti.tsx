import { useMemo, useState } from 'react'
import { Icon, ICONS } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { TxRow, txTitle } from '../components/TxRow'
import { CAT } from '../data/categories'
import type { Tx } from '../data/model'
import { useData } from '../data/store'
import { dayTitle, today } from '../lib/dates'
import { formatEur, formatSigned } from '../lib/money'

const FILTERS = [['tutti', 'Tutti'], ['uscite', 'Uscite'], ['entrate', 'Entrate'], ['giroconti', 'Giroconti']] as const
type Filter = (typeof FILTERS)[number][0]

const KEEP: Record<Filter, (tx: Tx) => boolean> = {
  tutti: () => true,
  uscite: (tx) => tx.type === 'uscita',
  entrate: (tx) => tx.type === 'entrata',
  giroconti: (tx) => tx.type === 'giroconto',
}

/** Quanto pesa un movimento sul totale del giorno: i giroconti non contano. */
const signed = (tx: Tx) => (tx.type === 'entrata' ? tx.cents : tx.type === 'uscita' ? -tx.cents : 0)

export function Movimenti() {
  const { accounts, txs } = useData()
  const [filter, setFilter] = useState<Filter>('tutti')
  const [query, setQuery] = useState('')
  const now = today()

  const names = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts])
  const meta = (tx: Tx) => {
    const from = names.get(tx.accountId) ?? ''
    if (tx.type === 'giroconto') return `${from} → ${names.get(tx.toAccountId ?? '') ?? ''}`
    return `${CAT[tx.category ?? 'altro'].name} · ${from}`
  }

  const q = query.trim().toLowerCase()
  const groups = useMemo(() => {
    const out: { date: string; rows: Tx[]; total: number }[] = []
    for (const tx of txs) {
      if (!KEEP[filter](tx)) continue
      if (q && ![txTitle(tx), meta(tx), formatEur(tx.cents)].some((s) => s.toLowerCase().includes(q))) continue
      let group = out[out.length - 1]
      if (!group || group.date !== tx.date) out.push((group = { date: tx.date, rows: [], total: 0 }))
      group.rows.push(tx)
      group.total += signed(tx)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, filter, q, names])

  return (
    <div className="page">
      <h1>Movimenti</h1>

      <div style={{ height: 48, borderRadius: 16, background: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
        <Icon d={ICONS.search} size={20} color="#5B6178" />
        <input
          type="search"
          aria-label="Cerca nei movimenti"
          placeholder="Cerca esercente, conto, importo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flexGrow: 1, border: 0, background: 'transparent', fontSize: 16, height: 44 }}
        />
      </div>

      <Segmented options={FILTERS} value={filter} onChange={setFilter} className="chips" />

      {groups.map((g) => (
        <div key={g.date} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="row-between" style={{ padding: '4px 4px 0' }}>
            <div className="section-title">{dayTitle(g.date, now)}</div>
            <div className="label" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatSigned(g.total)}</div>
          </div>
          <div className="card" style={{ padding: '4px 16px' }}>
            {g.rows.map((tx) => (
              <TxRow key={tx.id} tx={tx} meta={meta(tx)} />
            ))}
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <div className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
          {txs.length === 0 ? 'Ancora nessun movimento: tocca “+” per aggiungere il primo.' : 'Nessun movimento trovato'}
        </div>
      )}
    </div>
  )
}
