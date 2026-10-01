import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, Field, MIN_PASSPHRASE, MIN_PASSWORD, RecoveryKit } from '../auth/screens'
import { fetchMember, useSession } from '../auth/session'
import { useConfirm } from '../components/Confirm'
import { Icon, ICONS } from '../components/Icon'
import { generateRecoveryCode, unwrapWithPassphrase, wrapWithPassphrase, wrapWithRecoveryCode, WrongSecretError } from '../lib/crypto'
import { currentEndpoint, disablePush } from '../lib/push'
import { errorMessage, supabase } from '../lib/supabase'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card-title">{title}</div>
      {children}
    </div>
  )
}

/** Esegue un'azione sulla chiave di coppia: chiede la frase segreta, la verifica e restituisce la chiave. */
async function openKey(userId: string, passphrase: string) {
  const member = await fetchMember(userId)
  if (!member) throw new Error('Non fai ancora parte di una coppia.')
  return unwrapWithPassphrase(member.wrapped_key, passphrase)
}

function describe(e: unknown): string {
  return e instanceof WrongSecretError ? 'Frase segreta errata.' : errorMessage(e)
}

function PassphraseCard() {
  const { user } = useSession()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setDone(false)
    if (next.length < MIN_PASSPHRASE) return setError(`La nuova frase segreta deve avere almeno ${MIN_PASSPHRASE} caratteri.`)
    if (next !== repeat) return setError('Le due frasi nuove non coincidono.')
    setBusy(true)
    try {
      const raw = await openKey(user.id, current)
      const { data, error } = await supabase
        .from('members')
        .update({ wrapped_key: await wrapWithPassphrase(raw, next) })
        .eq('user_id', user.id)
        .select('user_id')
      if (error) throw error
      if (!data?.length) throw new Error('Non è stato possibile salvare la nuova frase.')
      setCurrent('')
      setNext('')
      setRepeat('')
      setDone(true)
    } catch (e) {
      setError(describe(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Cambia la frase segreta">
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        I dati non cambiano e i dispositivi già sbloccati non devono rifare nulla. La nuova frase servirà solo sui telefoni nuovi.
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Frase segreta attuale" id="frase-attuale" type="password" autoComplete="off" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Field label={`Nuova frase segreta (almeno ${MIN_PASSPHRASE} caratteri)`} id="frase-nuova" type="password" autoComplete="off" required value={next} onChange={(e) => setNext(e.target.value)} />
        <Field label="Ripeti la nuova frase" id="frase-nuova2" type="password" autoComplete="off" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        <ErrorBox>{error}</ErrorBox>
        {done && <div className="notice notice--ok">Frase segreta cambiata.</div>}
        <button type="submit" className="secondary-btn" disabled={busy}>{busy ? 'Un momento…' : 'Cambia frase segreta'}</button>
      </form>
    </Card>
  )
}

function KitCard({ onCode }: { onCode: (code: string) => void }) {
  const { user } = useSession()
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      const raw = await openKey(user.id, passphrase)
      const code = generateRecoveryCode()
      const { data, error } = await supabase
        .from('members')
        .update({ recovery_key: await wrapWithRecoveryCode(raw, code) })
        .eq('user_id', user.id)
        .select('user_id')
      if (error) throw error
      if (!data?.length) throw new Error('Non è stato possibile salvare il nuovo kit.')
      setPassphrase('')
      onCode(code)
    } catch (e) {
      setError(describe(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Nuovo kit di recupero">
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        Crea un kit nuovo se hai perso quello vecchio o pensi che l'abbia visto qualcun altro. Il vecchio smette di funzionare. Senza frase segreta e senza kit i dati non si recuperano.
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="La tua frase segreta" id="frase-kit" type="password" autoComplete="off" required value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
        <ErrorBox>{error}</ErrorBox>
        <button type="submit" className="secondary-btn" disabled={busy}>{busy ? 'Un momento…' : 'Crea un nuovo kit'}</button>
      </form>
    </Card>
  )
}

function PasswordCard() {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(false)
    if (password.length < MIN_PASSWORD) return setError(`La password deve avere almeno ${MIN_PASSWORD} caratteri.`)
    if (password !== repeat) return setError('Le due password non coincidono.')
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPassword('')
      setRepeat('')
      setDone(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Cambia la password">
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>È la password dell'accesso, non la frase segreta: da sola non apre i dati.</div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label={`Nuova password (almeno ${MIN_PASSWORD} caratteri)`} id="password-nuova" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field label="Ripeti la password" id="password-nuova2" type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        <ErrorBox>{error}</ErrorBox>
        {done && <div className="notice notice--ok">Password cambiata.</div>}
        <button type="submit" className="secondary-btn" disabled={busy}>{busy ? 'Un momento…' : 'Cambia password'}</button>
      </form>
    </Card>
  )
}

interface Device {
  endpoint: string
  created_at: string
}

function DevicesCard() {
  const ask = useConfirm()
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [mine, setMine] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await supabase.from('push_subscriptions').select('endpoint, created_at').order('created_at')
    if (error) return setError(errorMessage(error))
    setDevices((data ?? []) as Device[])
    setMine(await currentEndpoint())
  }
  useEffect(() => {
    void load()
  }, [])

  const remove = async (d: Device) => {
    const isMine = d.endpoint === mine
    if (!(await ask(isMine ? 'Disattivare le notifiche su questo iPhone?' : 'Togliere le notifiche da questo dispositivo?', { confirmLabel: 'Disattiva', danger: true }))) return
    if (isMine) await disablePush()
    else await supabase.from('push_subscriptions').delete().eq('endpoint', d.endpoint)
    await load()
  }

  return (
    <Card title="Dispositivi con le notifiche">
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        Qui vedi dove arrivano gli avvisi delle spese fisse. Se hai perso un telefono, toglilo da qui e poi esci da tutti i dispositivi.
      </div>
      <ErrorBox>{error}</ErrorBox>
      {devices?.length === 0 && <div className="muted" style={{ fontSize: 14 }}>Nessun dispositivo collegato.</div>}
      {devices?.map((d, i) => (
        <div key={d.endpoint} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{d.endpoint === mine ? 'Questo iPhone' : `Altro dispositivo ${i + 1}`}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Aggiunto il {new Date(d.created_at).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <button type="button" className="link" onClick={() => void remove(d)} style={{ height: 44, border: 0, background: 'transparent', color: 'var(--over)' }}>
            Togli
          </button>
        </div>
      ))}
    </Card>
  )
}

function EverywhereCard() {
  const ask = useConfirm()
  const { signOut } = useSession()
  return (
    <Card title="Esci da tutti i dispositivi">
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        Chiude l'accesso su ogni telefono e computer, compreso questo. Per rientrare servono email, password e frase segreta. Utile se hai perso o prestato un telefono.
      </div>
      <button
        type="button"
        className="secondary-btn"
        style={{ color: 'var(--over)', borderColor: '#F0C5C5' }}
        onClick={async () => {
          if (await ask('Uscire da tutti i dispositivi? Per rientrare servirà la frase segreta.', { confirmLabel: 'Esci ovunque', danger: true })) void signOut(true)
        }}
      >
        Esci da tutti i dispositivi
      </button>
    </Card>
  )
}

export function Sicurezza() {
  const [kit, setKit] = useState<string | null>(null)
  if (kit) return <RecoveryKit code={kit} onDone={() => setKit(null)} />

  return (
    <div className="page page--plain">
      <Link to="/impostazioni" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Impostazioni
      </Link>
      <div>
        <h1>Sicurezza e accessi</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>
          I dati sono cifrati sul telefono con la tua frase segreta. Il server non la conosce e non può leggerli.
        </div>
      </div>
      <PassphraseCard />
      <KitCard onCode={setKit} />
      <PasswordCard />
      <DevicesCard />
      <EverywhereCard />
    </div>
  )
}
