import { useState, type FormEvent, type ReactNode } from 'react'
import { ErrorBox, Field } from '../auth/screens'
import { useSession } from '../auth/session'
import { DEFAULT_ACCOUNTS, OWNER_LABEL, PEOPLE, PERSON_KEYS, type Account, type PersonKey } from '../data/model'
import { useData } from '../data/store'
import { parseEur } from '../lib/money'

/** Primo avvio: chi sei, poi i saldi iniziali dei conti. */
export function SetupGate({ children }: { children: ReactNode }) {
  const { loaded, synced, syncError, syncNow, me, accounts } = useData()

  if (!loaded) return <div className="page page--plain" />
  if (me && accounts.length > 0) return <>{children}</>
  // Prima di chiedere qualcosa bisogna sapere cosa ha già impostato il partner.
  if (!synced) {
    return (
      <div className="page page--plain">
        <h1 style={{ marginTop: 16 }}>Un momento…</h1>
        {syncError ? (
          <>
            <ErrorBox>{syncError}</ErrorBox>
            <div className="muted">Per il primo avvio serve la connessione.</div>
            <button type="button" className="secondary-btn" onClick={syncNow}>Riprova</button>
          </>
        ) : (
          <div className="muted">Controllo i dati della coppia.</div>
        )}
      </div>
    )
  }
  return me ? <OpeningBalances /> : <WhoAreYou />
}

function WhoAreYou() {
  const { user } = useSession()
  const { settings, saveSettings } = useData()
  const taken = new Set(Object.values(settings?.people ?? {}))

  const pick = (who: PersonKey) => {
    if (user) void saveSettings({ ...settings, people: { ...settings?.people, [user.id]: who } })
  }

  return (
    <div className="page page--plain">
      <h1 style={{ marginTop: 16 }}>Chi sei?</h1>
      <div className="muted" style={{ lineHeight: 1.45 }}>Serve per sapere di chi sono conti e movimenti. Si sceglie una volta sola.</div>
      {PERSON_KEYS.map((who) => (
        <button
          key={who}
          type="button"
          disabled={taken.has(who)}
          onClick={() => pick(who)}
          style={{ height: 76, borderRadius: 22, border: 0, background: PEOPLE[who].tint, color: PEOPLE[who].color, fontSize: 20, fontWeight: 700 }}
        >
          {PEOPLE[who].name}
          {taken.has(who) && ' · già scelto'}
        </button>
      ))}
    </div>
  )
}

function OpeningBalances() {
  const { saveAccounts } = useData()
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const fields = DEFAULT_ACCOUNTS.flatMap((a, i) =>
    (a.owner === 'entrambi' ? PERSON_KEYS : [a.owner]).map((who) => ({ key: `${i}:${who}`, index: i, who })),
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const accounts: Account[] = DEFAULT_ACCOUNTS.map((a, order) => ({ ...a, id: crypto.randomUUID(), order, opening: { jack: 0, fiore: 0 } }))
    for (const f of fields) {
      const text = (values[f.key] ?? '').trim()
      const cents = text === '' ? 0 : parseEur(text)
      if (cents === null) return setError(`"${text}" non è un importo valido: scrivi ad esempio 1.250,50`)
      accounts[f.index].opening[f.who] = cents
    }
    setBusy(true)
    await saveAccounts(accounts)
  }

  return (
    <div className="page page--plain">
      <h1 style={{ marginTop: 16 }}>Saldi iniziali</h1>
      <div className="muted" style={{ lineHeight: 1.45 }}>
        Scrivi quanto c'è oggi su ogni conto. Lascia vuoto dove non c'è nulla; potrai correggere i saldi dalle Impostazioni.
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {DEFAULT_ACCOUNTS.map((a, i) => (
          <div key={a.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="row-between" style={{ padding: '0 4px' }}>
              <div style={{ fontWeight: 700 }}>{a.name}</div>
              <div className="label">{OWNER_LABEL[a.owner]}</div>
            </div>
            <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)', gap: 8 }}>
              {fields.filter((f) => f.index === i).map((f) => (
                <Field
                  key={f.key}
                  id={`saldo-${f.key}`}
                  label={a.owner === 'entrambi' ? `Quota di ${PEOPLE[f.who].name} (€)` : 'Saldo (€)'}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ))}
            </div>
          </div>
        ))}
        <ErrorBox>{error}</ErrorBox>
        <button type="submit" className="primary-btn" disabled={busy}>Inizia a usare NAMI</button>
      </form>
    </div>
  )
}
