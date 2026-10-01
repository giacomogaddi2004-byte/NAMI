import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, ICONS } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { PEOPLE, PERSON_KEYS, type PiggyBank, type PiggyMove, type View } from '../data/model'
import { useData } from '../data/store'
import { longDay, monthName, shortDay, today } from '../lib/dates'
import { formatEur, formatEurRounded } from '../lib/money'
import { pace, piggyAmount, piggyShares } from '../lib/piggy'
import { useView } from '../lib/view'

const VIEWS = [['jack', PEOPLE.jack.name], ['fiore', PEOPLE.fiore.name], ['coppia', 'Coppia']] as const

const infoBox = { background: '#F5F2FD', borderRadius: 16, padding: 12 } as const
const infoLabel = { fontSize: 12, fontWeight: 600, color: '#5B4A8A' } as const
const infoValue = { fontSize: 18, fontWeight: 700, marginTop: 2 } as const
const actionBtn = { height: 50, borderRadius: 16, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const

/** "novembre, dicembre, gennaio" */
const monthList = (months: string[]) => months.map((m) => monthName(`${m}-01`)).join(', ')

function PiggyCard({ piggy }: { piggy: PiggyBank }) {
  const { piggyMoves, accounts, deleteMove } = useData()
  const [all, setAll] = useState(false)
  const day = today()

  const moves = piggyMoves.filter((m) => m.piggyId === piggy.id)
  const shares = piggyShares(piggyMoves, piggy.id)
  const saved = shares.jack + shares.fiore
  const missing = Math.max(piggy.goal - saved, 0)
  const pct = Math.min(100, Math.round((Math.max(saved, 0) / piggy.goal) * 100))
  const reached = saved >= piggy.goal
  const plan = pace(missing, day, piggy.deadline)
  const shown = all ? moves : moves.slice(0, 4)

  const remove = (m: PiggyMove) => {
    if (window.confirm(`Eliminare questo ${m.type} di ${formatEur(m.cents)}?`)) void deleteMove(m)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 26, overflow: 'hidden' }}>
      <div style={{ background: piggy.color, color: '#fff', padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="cat-icon" style={{ width: 52, height: 52, borderRadius: 17, background: 'rgba(255, 255, 255, 0.18)' }}>
          <Icon d={ICONS.piggy} size={28} color="#FFFFFF" />
        </div>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div className="num" style={{ fontWeight: 700, fontSize: 21 }}>{piggy.name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.85)' }}>
            {piggy.deadline ? `Obiettivo entro il ${longDay(piggy.deadline).replace(/^\S+ /, '')} ${piggy.deadline.slice(0, 4)}` : 'Nessuna scadenza'}
          </div>
        </div>
        <Link to={`/salvadanaio/${piggy.id}`} aria-label={`Modifica ${piggy.name}`} style={{ color: '#fff', height: 44, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          Modifica
        </Link>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <div className="num" style={{ fontSize: 34, fontWeight: 700 }}>{formatEur(saved)}</div>
          <div className="muted">di {formatEur(piggy.goal)}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="bar" style={{ height: 12, background: `${piggy.color}26` }}>
            <div style={{ width: `${pct}%`, background: piggy.color }} />
          </div>
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
            <span>{pct}%</span>
            <span>{reached ? 'Obiettivo raggiunto' : `Mancano ${formatEur(missing)}`}</span>
          </div>
        </div>

        {reached && (
          <Link
            to={`/aggiungi?piggy=${piggy.id}`}
            style={{ ...actionBtn, height: 56, background: '#157A43', color: '#fff', fontSize: 17 }}
          >
            Ottenuto
          </Link>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <div style={infoBox}>
            <div style={infoLabel}>Per arrivare in tempo</div>
            {plan.kind === 'ok' ? (
              <>
                <div className="num" style={infoValue}>{formatEurRounded(plan.perMonth)} al mese</div>
                <div className="muted" style={{ fontSize: 12 }}>{monthList(plan.months)}</div>
              </>
            ) : (
              <>
                <div className="num" style={infoValue}>{plan.kind === 'late' ? 'Scaduto' : reached ? 'Fatto' : 'Quando puoi'}</div>
                <div className="muted" style={{ fontSize: 12 }}>{plan.kind === 'late' ? 'la data è passata' : reached ? 'barra piena' : 'nessuna scadenza'}</div>
              </>
            )}
          </div>
          <div style={infoBox}>
            <div style={infoLabel}>Chi ha messo</div>
            {PERSON_KEYS.map((who) => (
              <div key={who} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginTop: 2, color: PEOPLE[who].color }}>
                <span>{PEOPLE[who].name}</span>
                <span className="num" style={{ fontSize: 14 }}>{formatEur(shares[who])}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <Link to={`/salvadanaio/${piggy.id}/versa`} style={{ ...actionBtn, background: piggy.color, color: '#fff' }}>Versa</Link>
          <Link to={`/salvadanaio/${piggy.id}/preleva`} style={{ ...actionBtn, border: `1.5px solid ${piggy.color}66`, background: '#fff', color: piggy.color }}>Preleva</Link>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-title">Storico</div>
          {moves.length === 0 && <div className="muted" style={{ fontSize: 14 }}>Ancora nessun versamento.</div>}
          {shown.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => remove(m)}
              aria-label={`Elimina ${m.type} di ${formatEur(m.cents)}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, border: 0, background: 'transparent', padding: 0, minHeight: 44, textAlign: 'left', fontSize: 14 }}
            >
              <span className="cat-icon" style={{ width: 32, height: 32, borderRadius: 16, background: PEOPLE[m.who].tint, color: PEOPLE[m.who].color, fontWeight: 700, fontSize: 13 }}>
                {PEOPLE[m.who].name[0]}
              </span>
              <span style={{ flexGrow: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{m.type === 'versamento' ? 'Versamento' : 'Prelievo'}{m.note ? ` · ${m.note}` : ''}</span>
                <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                  {shortDay(m.date, day)} · {accounts.find((a) => a.id === m.accountId)?.name ?? ''}
                </span>
              </span>
              <span className="tx-amount" style={{ color: m.type === 'versamento' ? 'var(--positive)' : 'var(--text)' }}>
                {m.type === 'versamento' ? '+' : '−'}{formatEur(m.cents)}
              </span>
            </button>
          ))}
          {moves.length > 4 && (
            <button type="button" className="link" onClick={() => setAll(!all)} style={{ height: 44, border: 0, background: 'transparent', alignSelf: 'flex-start', padding: 0 }}>
              {all ? 'Mostra meno' : `Mostra tutti (${moves.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function Salvadanai() {
  const { piggyBanks, piggyMoves } = useData()
  const [view, setView] = useView()

  const active = piggyBanks.filter((p) => !p.achieved)
  const done = piggyBanks.filter((p) => p.achieved)
  const mine = piggyAmount(piggyMoves, view)
  const shares = piggyShares(piggyMoves)

  return (
    <div className="page">
      <h1>Salvadanai</h1>

      <Segmented<View> options={VIEWS} value={view} onChange={setView} />

      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="label">Messi da parte{view !== 'coppia' && ` da ${PEOPLE[view].name}`}</div>
          <div className="num" style={{ fontSize: 30, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatEur(mine)}</div>
          {view === 'coppia' && (
            <div className="muted" style={{ fontSize: 12 }}>
              {PERSON_KEYS.map((who) => `${PEOPLE[who].name} ${formatEur(shares[who])}`).join(' · ')}
            </div>
          )}
        </div>
        <div className="muted" style={{ fontSize: 12, textAlign: 'right', maxWidth: 150, lineHeight: 1.4 }}>
          Già tolti dal saldo disponibile in home
        </div>
      </div>

      {active.map((p) => (
        <PiggyCard key={p.id} piggy={p} />
      ))}

      {piggyBanks.length === 0 && (
        <Link to="/salvadanaio/nuovo?preset=computer" className="card" style={{ color: 'inherit', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="card-title">Inizia da “Computer nuovo”</div>
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.4 }}>2.500 € entro il 31 gennaio 2027. Tocca per crearlo; potrai cambiare tutto.</div>
        </Link>
      )}

      <Link to="/salvadanaio/nuovo" className="dashed-btn" style={{ height: 76 }}>
        <Icon d={ICONS.plus} size={22} width={2.4} />
        Nuovo salvadanaio
      </Link>

      {done.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="section-title" style={{ paddingLeft: 4 }}>Ottenuti</div>
          <div className="list">
            {done.map((p) => (
              <Link key={p.id} to={`/salvadanaio/${p.id}`} className="list-row">
                <span style={{ width: 14, height: 14, borderRadius: 5, background: p.color, flexShrink: 0 }} />
                <span className="grow">
                  <span className="t">{p.name}</span>
                  <span className="s">Ottenuto il {longDay(p.achieved!).replace(/^\S+ /, '')}</span>
                </span>
                <span className="tx-amount">{formatEur(p.goal)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
