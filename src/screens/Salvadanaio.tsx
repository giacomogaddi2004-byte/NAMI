import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBox, Field } from '../auth/screens'
import type { PiggyBank } from '../data/model'
import { useData } from '../data/store'
import { formatEur, parseEur } from '../lib/money'

const COLORS = ['#7C4DDB', '#2B50E0', '#1F9D55', '#E8553A', '#E08A00', '#C93582']

const plain = (cents: number) => formatEur(cents).replace(' €', '')

/** Nuovo salvadanaio (`/salvadanaio/nuovo`) o modifica di uno esistente. */
export function Salvadanaio() {
  const { id } = useParams()
  const { piggyBanks } = useData()
  const existing = piggyBanks.find((p) => p.id === id)
  if (id !== 'nuovo' && !existing) return <Navigate to="/salvadanai" replace />
  return <PiggyForm key={id} existing={existing} />
}

function PiggyForm({ existing }: { existing?: PiggyBank }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { piggyBanks, savePiggy, deletePiggy } = useData()
  const preset = !existing && params.get('preset') === 'computer'

  const [name, setName] = useState(existing?.name ?? (preset ? 'Computer nuovo' : ''))
  const [goal, setGoal] = useState(existing ? plain(existing.goal) : preset ? '2.500,00' : '')
  const [deadline, setDeadline] = useState(existing?.deadline ?? (preset ? '2027-01-31' : ''))
  const [color, setColor] = useState(existing?.color ?? COLORS[piggyBanks.length % COLORS.length])
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cents = parseEur(goal)
    if (!name.trim()) return setError('Scrivi un nome per il salvadanaio.')
    if (!cents) return setError('Scrivi l’obiettivo in euro, ad esempio 2.500.')
    await savePiggy({
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      color,
      goal: cents,
      deadline: deadline || undefined,
      achieved: existing?.achieved,
      order: existing?.order ?? piggyBanks.length,
    })
    navigate(-1)
  }

  const remove = async () => {
    if (!existing) return
    const warning = existing.achieved ? '' : ' I soldi messi da parte tornano disponibili.'
    if (!window.confirm(`Eliminare “${existing.name}”?${warning}`)) return
    await deletePiggy(existing)
    navigate('/salvadanai', { replace: true })
  }

  return (
    <form className="page page--plain" onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 72px', alignItems: 'center' }}>
        <button type="button" className="back" onClick={() => navigate(-1)} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--primary)' }}>
          Annulla
        </button>
        <div className="card-title" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{existing ? 'Salvadanaio' : 'Nuovo salvadanaio'}</div>
        {existing && (
          <button type="button" onClick={remove} style={{ height: 44, border: 0, background: 'transparent', padding: 0, textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--over)' }}>
            Elimina
          </button>
        )}
      </div>

      <Field label="Nome" id="nome" required value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="Obiettivo (€)" id="obiettivo" inputMode="decimal" placeholder="0,00" value={goal} onChange={(e) => setGoal(e.target.value)} />
      <div className="field">
        <label htmlFor="scadenza">Data obiettivo (facoltativa)</label>
        <input id="scadenza" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      {deadline && (
        <button type="button" className="link" onClick={() => setDeadline('')} style={{ height: 44, border: 0, background: 'transparent', alignSelf: 'flex-start', padding: '0 4px' }}>
          Togli la data
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="label" style={{ paddingLeft: 4 }}>Colore</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === color}
              aria-label={`Colore ${c}`}
              onClick={() => setColor(c)}
              style={{ width: 44, height: 44, borderRadius: 22, background: c, border: c === color ? '3px solid var(--text)' : '3px solid transparent', outline: c === color ? '2px solid #fff' : 'none', outlineOffset: -5 }}
            />
          ))}
        </div>
      </div>

      <ErrorBox>{error}</ErrorBox>
      <div style={{ flexGrow: 1 }} />
      <button type="submit" className="primary-btn">Salva</button>
    </form>
  )
}
