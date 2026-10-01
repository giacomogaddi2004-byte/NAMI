import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ErrorBox, Field } from '../auth/screens'
import { Icon, ICONS } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { txTitle } from '../components/TxRow'
import { OWNER_LABEL, PEOPLE, PERSON_KEYS, type Account, type PersonKey } from '../data/model'
import { useData } from '../data/store'
import { computeShares, effectOn, isSplit, personOn } from '../lib/balances'
import { shortDay } from '../lib/dates'
import { formatEur, formatSigned, parseEur, TAX_PERCENT } from '../lib/money'

const FILTERS = [['tutti', 'Tutti'], ['jack', PEOPLE.jack.name], ['fiore', PEOPLE.fiore.name]] as const
type Filter = (typeof FILTERS)[number][0]

const SUBTITLE: Partial<Record<Account['kind'], string>> = {
  tasse: `Il ${TAX_PERCENT}% di ogni incasso con fattura finisce qui in automatico`,
  deposito: 'Conta nei risparmi, non nel saldo disponibile',
}

const money = (cents: number) => (cents < 0 ? '−' : '') + formatEur(cents)

/** Dettaglio di un conto: saldo, quote di Jack e Fiore, movimenti. */
export function Conto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accounts, txs } = useData()
  const [filter, setFilter] = useState<Filter>('tutti')
  const [editing, setEditing] = useState(false)

  const account = accounts.find((a) => a.id === id)
  const shares = useMemo(() => computeShares(accounts, txs), [accounts, txs])
  if (!account) return <Navigate to="/impostazioni" replace />

  const split = isSplit(account)
  const mine = shares.get(account.id)!
  const moves = txs.flatMap((tx) =>
    effectOn(account.id, tx).map((e) => ({ tx, cents: e.cents, who: personOn(account, tx, e.side), key: `${tx.id}:${e.side}` })),
  )
  const visible = moves.filter((m) => filter === 'tutti' || m.who === filter)

  return (
    <div className="page page--plain">
      <button type="button" className="back" onClick={() => navigate(-1)} style={{ border: 0, background: 'transparent', padding: 0, color: 'var(--primary)' }}>
        <Icon d={ICONS.left} size={20} width={2.2} />
        Indietro
      </button>
      <div>
        <h1>{account.name}</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>{SUBTITLE[account.kind] ?? OWNER_LABEL[account.owner]}</div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="label">Sul conto</div>
          <div className="num" style={{ fontSize: 34, fontWeight: 700 }}>{money(mine.jack + mine.fiore)}</div>
        </div>
        {split && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {PERSON_KEYS.map((who) => (
              <div key={who} style={{ background: PEOPLE[who].tint, borderRadius: 22, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: PEOPLE[who].color }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: PEOPLE[who].color }} />
                  {PEOPLE[who].name}
                </div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap' }}>{money(mine[who])}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {split && <Segmented options={FILTERS} value={filter} onChange={setFilter} className="chips" />}

      <div className="card" style={{ padding: '4px 16px' }}>
        {visible.map((m) => (
          <Link key={m.key} to={`/movimento/${m.tx.taxOf ?? m.tx.id}`} className="tx" style={{ color: 'inherit' }}>
            <span className="cat-icon" style={{ width: 42, height: 42, borderRadius: 21, background: PEOPLE[m.who].tint, color: PEOPLE[m.who].color, fontWeight: 700 }}>
              {PEOPLE[m.who].name[0]}
            </span>
            <div className="tx-main">
              <div className="tx-name">{txTitle(m.tx)}</div>
              <div className="tx-meta">{shortDay(m.tx.date)}</div>
            </div>
            <div className="tx-amount" style={{ color: m.cents < 0 ? 'var(--text)' : 'var(--positive)' }}>{formatSigned(m.cents)}</div>
          </Link>
        ))}
        <div className="tx">
          <div className="tx-main">
            <div className="tx-name">Saldo iniziale</div>
            <div className="tx-meta">
              {split ? PERSON_KEYS.map((who) => `${PEOPLE[who].name} ${formatEur(account.opening[who])}`).join(' · ') : 'Inserito al primo avvio'}
            </div>
          </div>
          {!split && <div className="tx-amount">{formatEur(account.opening[account.owner as PersonKey])}</div>}
          <button type="button" className="link" onClick={() => setEditing(!editing)} style={{ height: 44, border: 0, background: 'transparent', padding: '0 0 0 8px' }}>
            {editing ? 'Chiudi' : 'Correggi'}
          </button>
        </div>
      </div>

      {editing && <OpeningForm account={account} onDone={() => setEditing(false)} />}
    </div>
  )
}

function OpeningForm({ account, onDone }: { account: Account; onDone: () => void }) {
  const { saveAccounts } = useData()
  const people = account.owner === 'entrambi' ? PERSON_KEYS : [account.owner]
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(people.map((who) => [who, formatEur(account.opening[who]).replace(' €', '')])),
  )
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const opening = { ...account.opening }
    for (const who of people) {
      const cents = parseEur(values[who])
      if (cents === null) return setError(`"${values[who]}" non è un importo valido: scrivi ad esempio 1.250,50`)
      opening[who] = cents
    }
    await saveAccounts([{ ...account, opening }])
    onDone()
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {people.map((who) => (
        <Field
          key={who}
          id={`iniziale-${who}`}
          label={people.length > 1 ? `Saldo iniziale di ${PEOPLE[who].name} (€)` : 'Saldo iniziale (€)'}
          inputMode="decimal"
          value={values[who]}
          onChange={(e) => setValues({ ...values, [who]: e.target.value })}
        />
      ))}
      <ErrorBox>{error}</ErrorBox>
      <button type="submit" className="secondary-btn">Salva saldo iniziale</button>
    </form>
  )
}
