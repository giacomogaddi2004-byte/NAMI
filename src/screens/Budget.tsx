import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorBox } from '../auth/screens'
import { CatIcon, Icon, ICONS } from '../components/Icon'
import { CAT, EXPENSE_CATEGORIES, type CategoryKey } from '../data/categories'
import { useData } from '../data/store'
import { suggestLimits } from '../lib/budget'
import { today } from '../lib/dates'
import { formatEur, parseEur } from '../lib/money'

const plain = (cents: number) => formatEur(cents).replace(' €', '')

/** Budget mensili per categoria: lasciando vuoto non c'è limite. */
export function Budget() {
  const navigate = useNavigate()
  const { accounts, txs, budgets, setBudgets } = useData()
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const suggestion = useMemo(() => suggestLimits(txs, byId, today()), [txs, byId])
  const hasSuggestion = Object.keys(suggestion).length > 0

  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(EXPENSE_CATEGORIES.map((k) => [k, budgets.find((b) => b.category === k) ? plain(budgets.find((b) => b.category === k)!.limit) : ''])),
  )
  const [error, setError] = useState<string | null>(null)

  const total = EXPENSE_CATEGORIES.reduce((sum, k) => sum + (parseEur(values[k] ?? '') ?? 0), 0)

  const propose = () => {
    // Si compilano solo le categorie senza un limite già scelto.
    setValues((v) => Object.fromEntries(EXPENSE_CATEGORIES.map((k) => [k, v[k] || (suggestion[k] ? plain(suggestion[k]!) : '')])))
  }

  const save = async () => {
    const limits: Partial<Record<CategoryKey, number>> = {}
    for (const k of EXPENSE_CATEGORIES) {
      const text = (values[k] ?? '').trim()
      if (text === '') {
        limits[k] = 0
        continue
      }
      const cents = parseEur(text)
      if (cents === null) return setError(`“${text}” (${CAT[k].name}) non è un importo: scrivi ad esempio 250 o 1.200,50.`)
      limits[k] = cents
    }
    await setBudgets(limits)
    navigate(-1)
  }

  return (
    <div className="page page--plain">
      <button type="button" className="back" onClick={() => navigate(-1)} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--primary)' }}>
        <Icon d={ICONS.left} size={20} width={2.2} />
        Indietro
      </button>
      <div>
        <h1>Budget mensili</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>
          Quanto spendere al mese per categoria, in due. Avvisi all'80% e al 100%. Lascia vuoto dove non vuoi un limite.
        </div>
      </div>

      <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 22, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#DCE3FF' }}>Budget totale al mese</div>
        <div className="num" style={{ fontSize: 26, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatEur(total)}</div>
      </div>

      {hasSuggestion ? (
        <button type="button" className="secondary-btn" onClick={propose}>Proponi dalla spesa reale</button>
      ) : (
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
          Dopo il primo mese completo potrai far proporre i limiti dalla spesa reale.
        </div>
      )}

      <div className="list">
        {EXPENSE_CATEGORIES.map((k) => (
          <label key={k} className="list-row" style={{ cursor: 'text' }}>
            <CatIcon cat={k} box={40} radius={13} icon={21} />
            <span className="grow">
              <span className="t">{CAT[k].name}</span>
              {suggestion[k] !== undefined && <span className="s">Proposta {formatEur(suggestion[k]!)}</span>}
            </span>
            <input
              aria-label={`Budget per ${CAT[k].name}`}
              inputMode="decimal"
              placeholder="nessuno"
              value={values[k]}
              onChange={(e) => setValues({ ...values, [k]: e.target.value })}
              style={{ width: 110, height: 44, border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px', fontSize: 16, fontWeight: 600, textAlign: 'right', background: '#fff' }}
            />
            <span className="muted" style={{ fontWeight: 600 }}>€</span>
          </label>
        ))}
      </div>

      <ErrorBox>{error}</ErrorBox>
      <button type="button" className="primary-btn" onClick={save}>Salva budget</button>
    </div>
  )
}
