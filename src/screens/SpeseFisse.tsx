import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CatIcon, Icon, ICONS } from '../components/Icon'
import { FIXED, SUBSCRIPTIONS, TODAY_DAY } from '../data/mock'
import { formatEur } from '../lib/money'

export function SpeseFisse() {
  const [open, setOpen] = useState(true)

  const all = FIXED.flatMap((d) => d.rows.map((r) => ({ ...r, day: d.day })))
  const monthly = all.reduce((a, r) => a + r.cents, 0)
  const next = all.find((r) => r.day > TODAY_DAY)

  return (
    <div className="page page--plain">
      <Link to="/impostazioni" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Impostazioni
      </Link>
      <div>
        <h1>Spese fisse</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Registrate in automatico alla scadenza, dal tuo conto corrente</div>
      </div>

      <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 22, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#DCE3FF' }}>Ogni mese</div>
          <div className="num" style={{ fontSize: 30, fontWeight: 700 }}>{formatEur(monthly)}</div>
        </div>
        {next && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#DCE3FF' }}>Prossima</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{next.name}</div>
            <div style={{ fontSize: 13, color: '#DCE3FF' }}>{next.day} ottobre · {formatEur(next.cents)}</div>
          </div>
        )}
      </div>

      {FIXED.map((d) => {
        const done = d.day <= TODAY_DAY
        return (
          <div key={d.day} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row-between" style={{ padding: '4px 4px 0' }}>
              <div className="section-title">Giorno {d.day}</div>
              <div className="label" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEur(d.rows.reduce((a, r) => a + r.cents, 0))}</div>
            </div>
            <div className="list">
              {d.rows.map((r) => (
                <div key={r.name} className="list-row" style={{ display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64 }}>
                    <CatIcon cat={r.cat} box={40} radius={13} icon={21} />
                    <div className="grow">
                      <div className="tx-name">{r.name}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: done ? 'var(--positive)' : 'var(--text-2)' }}>
                        {done ? 'Registrata il' : 'In arrivo il'} {d.day} ottobre
                      </div>
                    </div>
                    <div className="tx-amount">{formatEur(r.cents)}</div>
                    {r.subs && (
                      <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        aria-expanded={open}
                        aria-label="Mostra i singoli abbonamenti"
                        className="cat-icon"
                        style={{ width: 44, height: 44, border: 0, borderRadius: 12, background: '#F1F2F7', color: 'var(--text-3)' }}
                      >
                        <Icon d={open ? ICONS.up : ICONS.down} size={18} width={2.4} />
                      </button>
                    )}
                  </div>
                  {r.subs && open && (
                    <div style={{ margin: '0 0 12px 52px', background: '#FBF2F7', borderRadius: 14, padding: '6px 12px' }}>
                      {SUBSCRIPTIONS.map(([name, cents]) => (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 34, fontSize: 14 }}>
                          <span>{name}</span>
                          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatEur(cents)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <button type="button" className="dashed-btn" style={{ height: 56, borderRadius: 18 }}>+ Aggiungi spesa fissa</button>
    </div>
  )
}
