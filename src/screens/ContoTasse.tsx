import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, ICONS } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { PEOPLE, TAX_MOVES, type PersonKey } from '../data/mock'
import { formatEur, formatSigned, TAX_PERCENT } from '../lib/money'

const FILTERS = [['tutti', 'Tutti'], ['jack', PEOPLE.jack.name], ['fiore', PEOPLE.fiore.name]] as const
type Filter = (typeof FILTERS)[number][0]

const PERSON_KEYS = Object.keys(PEOPLE) as PersonKey[]

export function ContoTasse() {
  const [filter, setFilter] = useState<Filter>('tutti')

  const balance = (who: PersonKey) => TAX_MOVES.filter((m) => m.who === who).reduce((a, m) => a + m.cents, 0)
  const total = PERSON_KEYS.reduce((a, who) => a + balance(who), 0)
  const moves = TAX_MOVES.filter((m) => filter === 'tutti' || m.who === filter)

  return (
    <div className="page page--plain">
      <Link to="/impostazioni" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Impostazioni
      </Link>
      <div>
        <h1>Conto tasse</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
          Il {TAX_PERCENT}% di ogni incasso con fattura finisce qui in automatico
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="label">Sul conto</div>
          <div className="num" style={{ fontSize: 34, fontWeight: 700 }}>{formatEur(total)}</div>
          <div className="muted" style={{ fontSize: 12 }}>Non conta nel saldo disponibile</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {PERSON_KEYS.map((who) => (
            <div key={who} style={{ background: PEOPLE[who].tint, borderRadius: 22, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: PEOPLE[who].color }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: PEOPLE[who].color }} />
                {PEOPLE[who].name}
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap' }}>{formatEur(balance(who))}</div>
            </div>
          ))}
        </div>
      </div>

      <Segmented options={FILTERS} value={filter} onChange={setFilter} className="chips" />

      <div className="card" style={{ padding: '4px 16px' }}>
        {moves.map((m, i) => (
          <div key={i} className="tx">
            <span className="cat-icon" style={{ width: 42, height: 42, borderRadius: 21, background: PEOPLE[m.who].tint, color: PEOPLE[m.who].color, fontWeight: 700 }}>
              {PEOPLE[m.who].name[0]}
            </span>
            <div className="tx-main">
              <div className="tx-name">{m.name}</div>
              <div className="tx-meta">{m.date}</div>
            </div>
            <div className="tx-amount" style={{ color: m.cents < 0 ? 'var(--text)' : 'var(--positive)' }}>{formatSigned(m.cents)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
