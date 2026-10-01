import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ErrorBox, Field } from '../auth/screens'
import { Segmented } from '../components/Segmented'
import { CAT, EXPENSE_CATEGORIES, type CategoryKey } from '../data/categories'
import { PEOPLE, type PersonKey, type Recurrence } from '../data/model'
import { useData } from '../data/store'
import { isSplit } from '../lib/balances'
import { addDays, today } from '../lib/dates'
import { formatEur, parseEur } from '../lib/money'

const WHO = [['jack', PEOPLE.jack.name], ['fiore', PEOPLE.fiore.name]] as const
const smallLabel = { fontSize: 12, fontWeight: 600, color: 'var(--text-2)' } as const
const plain = (cents: number) => formatEur(cents).replace(' €', '')

/** Nuova spesa fissa (`/spesa-fissa/nuova`) o modifica di una esistente. */
export function SpesaFissa() {
  const { id } = useParams()
  const { recurrences } = useData()
  const existing = recurrences.find((r) => r.id === id)
  if (id !== 'nuova' && !existing) return <Navigate to="/spese-fisse" replace />
  return <RecurrenceForm key={id} existing={existing} />
}

function RecurrenceForm({ existing }: { existing?: Recurrence }) {
  const navigate = useNavigate()
  const { accounts, me, saveRecurrences, deleteRecurrence } = useData()
  const defaultAccount = accounts.find((a) => a.owner === me && a.kind === 'corrente') ?? accounts[0]

  const [name, setName] = useState(existing?.name ?? '')
  const [amount, setAmount] = useState(existing ? plain(existing.cents) : '')
  const [day, setDay] = useState(String(existing?.day ?? ''))
  const [category, setCategory] = useState<CategoryKey>(existing?.category ?? 'casa')
  const [accountId, setAccountId] = useState(existing?.accountId ?? defaultAccount.id)
  const [who, setWho] = useState<PersonKey>(existing?.who ?? me ?? 'jack')
  const [subs, setSubs] = useState(existing?.subs?.map((s) => ({ name: s.name, amount: plain(s.cents) })) ?? [])
  const [error, setError] = useState<string | null>(null)

  const account = accounts.find((a) => a.id === accountId)
  const hasSubs = subs.length > 0
  const subsTotal = subs.reduce((sum, s) => sum + (parseEur(s.amount) ?? 0), 0)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const dayNumber = Number(day)
    if (!name.trim()) return setError('Scrivi il nome della spesa.')
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) return setError('Il giorno deve essere un numero da 1 a 31.')
    const details = []
    for (const s of subs) {
      const cents = parseEur(s.amount)
      if (!s.name.trim() || !cents) return setError('Ogni dettaglio deve avere un nome e un importo.')
      details.push({ name: s.name.trim(), cents })
    }
    const cents = hasSubs ? subsTotal : parseEur(amount)
    if (!cents) return setError('Scrivi un importo maggiore di zero, ad esempio 34,90.')
    await saveRecurrences([
      {
        id: existing?.id ?? crypto.randomUUID(),
        name: name.trim(),
        cents,
        day: dayNumber,
        category,
        accountId,
        who,
        start: existing?.start ?? addDays(today(), 1),
        subs: hasSubs ? details : undefined,
      },
    ])
    navigate(-1)
  }

  const remove = async () => {
    if (!existing || !window.confirm(`Eliminare ${existing.name}? I movimenti già registrati restano.`)) return
    await deleteRecurrence(existing)
    navigate(-1)
  }

  return (
    <form className="page page--plain" onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 72px', alignItems: 'center' }}>
        <button type="button" className="back" onClick={() => navigate(-1)} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--primary)' }}>
          Annulla
        </button>
        <div className="card-title" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{existing ? 'Spesa fissa' : 'Nuova spesa fissa'}</div>
        {existing && (
          <button type="button" onClick={remove} style={{ height: 44, border: 0, background: 'transparent', padding: 0, textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--over)' }}>
            Elimina
          </button>
        )}
      </div>

      <Field label="Nome" id="nome" required value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <Field
          label={hasSubs ? 'Importo (somma dei dettagli)' : 'Importo (€)'}
          id="importo"
          inputMode="decimal"
          placeholder="0,00"
          disabled={hasSubs}
          value={hasSubs ? plain(subsTotal) : amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Field label="Giorno del mese" id="giorno" inputMode="numeric" placeholder="1–31" value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <label className="field-btn" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <span style={smallLabel}>Categoria</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as CategoryKey)} className="plain-select">
            {EXPENSE_CATEGORIES.map((k) => (
              <option key={k} value={k}>{CAT[k].name}</option>
            ))}
          </select>
        </label>
        <label className="field-btn" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <span style={smallLabel}>Dal conto</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="plain-select">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
      </div>
      {account && isSplit(account) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={smallLabel}>Dalla quota di</div>
          <Segmented options={WHO} value={who} onChange={setWho} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="section-title" style={{ paddingLeft: 4 }}>Dettagli (facoltativi)</div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.4, paddingLeft: 4 }}>
          Per una voce unica fatta di più parti, come i singoli abbonamenti. L'importo diventa la loro somma.
        </div>
        {subs.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px 44px', gap: 8, alignItems: 'center' }}>
            <Field label="Nome" id={`dettaglio-${i}`} value={s.name} onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <Field label="€" id={`dettaglio-importo-${i}`} inputMode="decimal" value={s.amount} onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
            <button type="button" aria-label="Togli questo dettaglio" onClick={() => setSubs(subs.filter((_, j) => j !== i))} style={{ height: 44, border: 0, background: 'transparent', color: 'var(--over)', fontSize: 22 }}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="link" onClick={() => setSubs([...subs, { name: '', amount: '' }])} style={{ height: 44, border: 0, background: 'transparent', alignSelf: 'flex-start', paddingLeft: 4 }}>
          + Aggiungi dettaglio
        </button>
      </div>

      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        {existing
          ? 'Le modifiche valgono dalla prossima scadenza: i movimenti già registrati non cambiano.'
          : 'La prima registrazione avverrà alla prossima scadenza, a partire da domani.'}
      </div>
      <ErrorBox>{error}</ErrorBox>
      <div style={{ flexGrow: 1 }} />
      <button type="submit" className="primary-btn">Salva spesa fissa</button>
    </form>
  )
}
