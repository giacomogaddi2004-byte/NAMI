import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ErrorBox } from '../auth/screens'
import { Segmented } from '../components/Segmented'
import { PEOPLE, PERSON_KEYS, type Account, type PersonKey, type PiggyBank } from '../data/model'
import { useData } from '../data/store'
import { countsInAvailable, isSplit } from '../lib/balances'
import { today } from '../lib/dates'
import { formatEur, parseEur } from '../lib/money'
import { piggyShares } from '../lib/piggy'

const WHO = PERSON_KEYS.map((who) => [who, PEOPLE[who].name] as const)
const smallLabel = { fontSize: 12, fontWeight: 600, color: 'var(--text-2)' } as const

/** Versamento o prelievo (`/salvadanaio/:id/versa` e `/preleva`). */
export function VersaPreleva() {
  const { id, action } = useParams()
  const { piggyBanks } = useData()
  const piggy = piggyBanks.find((p) => p.id === id)
  if (!piggy || piggy.achieved || (action !== 'versa' && action !== 'preleva')) return <Navigate to="/salvadanai" replace />
  return <MoveForm key={`${id}-${action}`} piggy={piggy} withdraw={action === 'preleva'} />
}

function MoveForm({ piggy, withdraw }: { piggy: PiggyBank; withdraw: boolean }) {
  const navigate = useNavigate()
  const { accounts, piggyMoves, me, saveMove } = useData()
  const sources: Account[] = accounts.filter(countsInAvailable)
  const mine = sources.find((a) => a.owner === me) ?? sources[0]

  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(mine.id)
  const [chosenWho, setChosenWho] = useState<PersonKey>(me ?? 'jack')
  const [date, setDate] = useState(today())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const account = accounts.find((a) => a.id === accountId)
  const shares = piggyShares(piggyMoves, piggy.id)
  // Su un conto di una sola persona la quota è sua; sui conti di entrambi si sceglie.
  const who: PersonKey = !withdraw && account && !isSplit(account) ? (account.owner as PersonKey) : chosenWho
  const available = shares[who]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cents = parseEur(amount)
    if (!cents) return setError('Scrivi un importo maggiore di zero, ad esempio 50.')
    if (withdraw && cents > available) {
      return setError(`${PEOPLE[who].name} ha messo ${formatEur(available)}: non puoi prelevare di più.`)
    }
    setBusy(true)
    // Il prelievo non sposta soldi: ricorda l'ultimo conto usato da questa persona.
    const lastUsed = piggyMoves.find((m) => m.who === who && m.type === 'versamento')?.accountId
    await saveMove({
      id: crypto.randomUUID(),
      piggyId: piggy.id,
      type: withdraw ? 'prelievo' : 'versamento',
      cents,
      date,
      accountId: withdraw ? (lastUsed ?? accountId) : accountId,
      who,
    })
    navigate(-1)
  }

  return (
    <form className="page page--plain" onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 72px', alignItems: 'center' }}>
        <button type="button" className="back" onClick={() => navigate(-1)} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--primary)' }}>
          Annulla
        </button>
        <div className="card-title" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{withdraw ? 'Preleva' : 'Versa'}</div>
      </div>
      <div className="muted" style={{ textAlign: 'center', marginTop: -8 }}>{piggy.name}</div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0 2px' }}>
        <label htmlFor="importo" className="label">Importo</label>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <input
            id="importo"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="num"
            style={{ width: 210, border: 0, background: 'transparent', textAlign: 'right', fontWeight: 700, fontSize: 58, padding: 0, color: piggy.color }}
          />
          <span className="num muted" style={{ fontWeight: 700, fontSize: 38 }}>€</span>
        </div>
      </div>

      {!withdraw && (
        <label className="field-btn" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <span style={smallLabel}>Dal conto</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="plain-select">
            {sources.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
      )}

      {(withdraw || (account && isSplit(account))) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={smallLabel}>{withdraw ? 'Preleva dalla quota di' : 'Dalla quota di'}</div>
          <Segmented options={WHO} value={chosenWho} onChange={setChosenWho} />
        </div>
      )}
      {withdraw && <div className="muted" style={{ fontSize: 13 }}>{PEOPLE[who].name} ha messo {formatEur(available)} in questo salvadanaio.</div>}

      <label className="field-btn" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
        <span style={smallLabel}>Data</span>
        <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="plain-select" />
      </label>

      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        {withdraw
          ? 'I soldi tornano disponibili: nulla si sposta tra i conti.'
          : 'I soldi restano sul conto ma escono dal saldo disponibile finché sono nel salvadanaio.'}
      </div>

      <ErrorBox>{error}</ErrorBox>
      <div style={{ flexGrow: 1 }} />
      <button type="submit" className="primary-btn" disabled={busy}>{withdraw ? 'Preleva' : 'Versa'}</button>
    </form>
  )
}
