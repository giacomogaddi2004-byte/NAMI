import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBox } from '../auth/screens'
import { CatIcon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { CAT, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type CategoryKey } from '../data/categories'
import { PEOPLE, type Account, type PersonKey, type PiggyBank, type Tx, type TxType } from '../data/model'
import { useData } from '../data/store'
import { isSplit } from '../lib/balances'
import { today } from '../lib/dates'
import { formatEur, parseEur, TAX_PERCENT, taxShare } from '../lib/money'
import { piggyShares, settlements } from '../lib/piggy'
import { crossed } from '../lib/budget'
import { showLocal } from '../lib/push'
import { categoryFor, normalizeMerchant, sameMerchant } from '../lib/rules'

const TYPES = [['uscita', 'Uscita'], ['entrata', 'Entrata'], ['giroconto', 'Giroconto']] as const
const WHO = [['jack', PEOPLE.jack.name], ['fiore', PEOPLE.fiore.name]] as const

const SAVE_LABEL: Record<TxType, string> = { uscita: 'Salva spesa', entrata: 'Salva entrata', giroconto: 'Salva giroconto' }
const MERCHANT_LABEL: Record<TxType, string> = { uscita: 'Esercente', entrata: 'Da chi', giroconto: 'Descrizione (facoltativa)' }

const smallLabel = { fontSize: 12, fontWeight: 600, color: 'var(--text-2)' } as const

function AccountSelect({ label, value, onChange, accounts }: { label: string; value: string; onChange: (id: string) => void; accounts: Account[] }) {
  return (
    <label className="field-btn" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
      <span style={smallLabel}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="plain-select">
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </label>
  )
}

/** Nei conti di entrambi bisogna dire di chi è la quota. */
function WhoSelect({ label, value, onChange }: { label: string; value: PersonKey; onChange: (who: PersonKey) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={smallLabel}>{label}</div>
      <Segmented options={WHO} value={value} onChange={onChange} />
    </div>
  )
}

/** Nuovo movimento, oppure modifica di uno esistente (`/movimento/:id`). */
export function Aggiungi() {
  const { id } = useParams()
  const { txs, piggyBanks } = useData()
  const [params] = useSearchParams()
  const existing = id ? txs.find((t) => t.id === id) : undefined
  // Arrivando da “Ottenuto”: l'acquisto libera i soldi del salvadanaio.
  const piggy = !id ? piggyBanks.find((p) => p.id === params.get('piggy') && !p.achieved) : undefined
  // Movimento cancellato nel frattempo, magari dal partner.
  if (id && !existing) return <Navigate to="/movimenti" replace />
  return <TxForm key={id ?? piggy?.id ?? 'nuovo'} existing={existing} piggy={piggy} />
}

function TxForm({ existing, piggy }: { existing?: Tx; piggy?: PiggyBank }) {
  const navigate = useNavigate()
  const { accounts, txs, rules, budgets, me, piggyMoves, saveTx, deleteTx, saveTxs, saveRule, completePiggy } = useData()
  const mine = accounts.find((a) => a.owner === me) ?? accounts[0]

  const [type, setType] = useState<TxType>(existing?.type ?? 'uscita')
  const [amount, setAmount] = useState(existing ? formatEur(existing.cents).replace(' €', '') : piggy ? formatEur(piggy.goal).replace(' €', '') : '')
  const [merchant, setMerchant] = useState(existing?.merchant ?? '')
  // Categoria scelta a mano per un'uscita; finché è null decide la regola dell'esercente.
  const [expensePick, setExpensePick] = useState<CategoryKey | null>(existing?.type === 'uscita' && !existing.review ? (existing.category ?? 'altro') : null)
  const [incomeCat, setIncomeCat] = useState<CategoryKey>(existing?.type === 'entrata' ? (existing.category ?? 'altro') : 'lavoro')
  const [accountId, setAccountId] = useState(existing?.accountId ?? mine.id)
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? accounts.find((a) => a.id !== mine.id)?.id ?? mine.id)
  const [who, setWho] = useState<PersonKey>(existing?.who ?? me ?? 'jack')
  const [toWho, setToWho] = useState<PersonKey>(existing?.toWho ?? existing?.who ?? me ?? 'jack')
  const [date, setDate] = useState(existing?.date ?? today())
  // Finché non lo tocchi, l'interruttore Fattura è acceso solo per la categoria Lavoro.
  const [invoiceChoice, setInvoiceChoice] = useState<boolean | null>(existing?.type === 'entrata' ? !!existing.invoice : null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isIncome = type === 'entrata'
  const isTransfer = type === 'giroconto'
  const cents = parseEur(amount)
  const invoice = invoiceChoice ?? incomeCat === 'lavoro'
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const suggested = categoryFor(merchant, rules)
  const picked = isIncome ? incomeCat : (expensePick ?? suggested ?? 'altro')
  const pick = isIncome ? setIncomeCat : setExpensePick
  const shop = merchant.trim()
  const hint = isIncome
    ? 'Entrate variabili'
    : expensePick
      ? ''
      : suggested
        ? `Proposta per ${shop}`
        : shop
          ? 'Esercente nuovo: da controllare'
          : ''

  const from = accounts.find((a) => a.id === accountId)
  const to = accounts.find((a) => a.id === toAccountId)
  const fromSplit = !!from && isSplit(from)
  const toSplit = isTransfer && !!to && isSplit(to)

  // Acquisto con i soldi del salvadanaio: chi non paga gira la sua parte a chi paga.
  const payer: PersonKey = fromSplit || !from ? who : (from.owner as PersonKey)
  const transfers = piggy && type === 'uscita' ? settlements(accounts, piggyShares(piggyMoves, piggy.id), payer, accountId) : []

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!cents) return setError('Scrivi un importo maggiore di zero, ad esempio 12,50.')
    if (!date) return setError('Scegli una data.')
    const sameQuota = (fromSplit ? who : null) === (toSplit ? toWho : null)
    if (isTransfer && accountId === toAccountId && sameQuota) return setError('Scegli due conti diversi.')
    setBusy(true)
    const id = existing?.id ?? crypto.randomUUID()
    const tx: Tx = {
      id,
      type,
      cents,
      date,
      accountId,
      toAccountId: isTransfer ? toAccountId : undefined,
      merchant: merchant.trim(),
      category: isTransfer ? undefined : picked,
      // Nei conti di un solo titolare la quota è sempre la sua.
      who: fromSplit || !from || from.owner === 'entrambi' ? who : from.owner,
      toWho: toSplit ? toWho : undefined,
      invoice: isIncome ? invoice : undefined,
      review: type === 'uscita' && !expensePick && !suggested ? true : undefined,
      recurrenceId: existing?.recurrenceId,
      recurrenceMonth: existing?.recurrenceMonth,
    }
    if (piggy && type === 'uscita') await completePiggy(piggy, tx)
    else await saveTx(tx)
    await learnRule(id)
    void warnBudget(tx)
    navigate(-1)
  }

  /** Se questa spesa porta una categoria all'80% o al 100% del budget, avvisa su questo telefono. */
  const warnBudget = async (saved: Tx) => {
    const budget = budgets.find((b) => b.category === saved.category)
    if (saved.type !== 'uscita' || !budget || saved.date.slice(0, 7) !== today().slice(0, 7)) return
    const before = txs
      .filter((t) => t.id !== saved.id && t.type === 'uscita' && t.category === saved.category && t.date.slice(0, 7) === saved.date.slice(0, 7))
      .reduce((sum, t) => sum + t.cents, 0)
    const hit = crossed(before, before + saved.cents, budget.limit)
    if (!hit) return
    const name = CAT[budget.category].name
    await showLocal(
      `Budget ${name}`,
      hit === 'over' ? `Hai superato il budget di ${formatEur(before + saved.cents - budget.limit)}.` : 'Sei oltre l’80% del budget del mese.',
    ).catch(() => {})
  }

  /** Categoria cambiata a mano per un esercente: propone di ricordarla e di correggere il passato. */
  const learnRule = async (savedId: string) => {
    const changed = !existing || existing.review || existing.category !== expensePick || existing.merchant !== shop
    if (type !== 'uscita' || !expensePick || !shop || suggested === expensePick || !changed) return
    if (!window.confirm(`Usare sempre “${CAT[expensePick].name}” per ${shop}?`)) return
    const pattern = normalizeMerchant(shop)
    await saveRule({ id: rules.find((r) => r.pattern === pattern)?.id ?? crypto.randomUUID(), pattern, label: shop, category: expensePick })
    const past = sameMerchant(txs, shop, expensePick, savedId)
    if (past.length > 0 && window.confirm(`Correggere anche ${past.length === 1 ? 'il movimento passato' : `i ${past.length} movimenti passati`} di ${shop}?`)) {
      await saveTxs(past.map((t) => ({ ...t, category: expensePick, review: undefined })))
    }
  }

  const remove = async () => {
    if (!existing || !window.confirm('Eliminare questo movimento?')) return
    setBusy(true)
    await deleteTx(existing.id)
    navigate(-1)
  }

  return (
    <form className="page page--plain" onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 72px', alignItems: 'center' }}>
        <button type="button" className="back" onClick={() => navigate(-1)} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--primary)' }}>
          Annulla
        </button>
        <div className="card-title" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{existing ? 'Modifica' : 'Nuovo movimento'}</div>
        {existing && (
          <button type="button" onClick={remove} disabled={busy} style={{ height: 44, border: 0, background: 'transparent', padding: 0, textAlign: 'right', fontSize: 16, fontWeight: 600, color: 'var(--over)' }}>
            Elimina
          </button>
        )}
      </div>

      {piggy ? (
        <div className="notice notice--ok">
          Acquisto per <b>{piggy.name}</b>. Scegli l'esercente: al salvataggio i soldi messi da parte tornano disponibili e il salvadanaio risulta ottenuto.
          {transfers.map((t) => (
            <div key={t.who} style={{ marginTop: 6 }}>
              Pareggio automatico: {formatEur(t.cents)} dal conto di {PEOPLE[t.who].name} a {from?.name ?? 'questo conto'}.
            </div>
          ))}
        </div>
      ) : (
        <Segmented options={TYPES} value={type} onChange={setType} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0 2px' }}>
        <label htmlFor="importo" className="label">Importo</label>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <input
            id="importo"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            autoFocus={!existing}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="num"
            style={{ width: 210, border: 0, background: 'transparent', textAlign: 'right', fontWeight: 700, fontSize: 58, padding: 0, color: isIncome ? 'var(--positive)' : 'var(--text)' }}
          />
          <span className="num muted" style={{ fontWeight: 700, fontSize: 38 }}>€</span>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 18, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label htmlFor="esercente" style={smallLabel}>{MERCHANT_LABEL[type]}</label>
        <input
          id="esercente"
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          style={{ border: 0, background: 'transparent', fontSize: 17, fontWeight: 600, padding: '4px 0', height: 28 }}
        />
      </div>

      {isTransfer ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AccountSelect label="Da" value={accountId} onChange={setAccountId} accounts={accounts} />
          {fromSplit && <WhoSelect label="Dalla quota di" value={who} onChange={setWho} />}
          <AccountSelect label="A" value={toAccountId} onChange={setToAccountId} accounts={accounts} />
          {toSplit && <WhoSelect label="Alla quota di" value={toWho} onChange={setToWho} />}
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>Un giroconto non conta né come spesa né come entrata.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row-between">
            <div style={{ fontSize: 14, fontWeight: 700 }}>Categoria</div>
            <div style={{ ...smallLabel, color: !isIncome && !expensePick && !suggested ? '#8A4B00' : smallLabel.color }}>{hint}</div>
          </div>
          <div className="cat-grid">
            {cats.map((k) => {
              const on = k === picked
              return (
                <button
                  key={k}
                  type="button"
                  className="cat-btn"
                  aria-pressed={on}
                  onClick={() => pick(k)}
                  style={on ? { borderColor: CAT[k].color, background: CAT[k].tint } : undefined}
                >
                  <CatIcon cat={k} box={34} radius={11} icon={20} background={on ? '#fff' : undefined} />
                  <span>{CAT[k].name}</span>
                </button>
              )
            })}
          </div>
          {isIncome && (
            <div style={{ background: '#fff', borderRadius: 18, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 60 }}>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Fattura</div>
                <div style={{ ...smallLabel, color: invoice ? 'var(--positive)' : 'var(--text-2)' }}>
                  {invoice
                    ? `${TAX_PERCENT}% al conto tasse${cents ? `: ${formatEur(taxShare(cents))}` : ''}`
                    : 'Incasso senza fattura: niente al conto tasse'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={invoice}
                aria-label="Fattura"
                onClick={() => setInvoiceChoice(!invoice)}
                style={{ width: 52, height: 44, border: 0, background: 'transparent', padding: '6px 0', flexShrink: 0 }}
              >
                <span style={{ display: 'block', width: 52, height: 32, borderRadius: 16, background: invoice ? '#1F9D55' : '#C3C8D6', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 3, left: invoice ? 23 : 3, width: 26, height: 26, borderRadius: 13, background: '#fff', transition: 'left 0.15s' }} />
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isTransfer ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {!isTransfer && <AccountSelect label="Conto" value={accountId} onChange={setAccountId} accounts={accounts} />}
        <label className="field-btn" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <span style={smallLabel}>Data</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="plain-select" />
        </label>
      </div>
      {!isTransfer && fromSplit && <WhoSelect label={isIncome ? 'Nella quota di' : 'Dalla quota di'} value={who} onChange={setWho} />}

      <ErrorBox>{error}</ErrorBox>
      <div style={{ flexGrow: 1 }} />
      <button type="submit" className="primary-btn" disabled={busy}>{SAVE_LABEL[type]}</button>
    </form>
  )
}
