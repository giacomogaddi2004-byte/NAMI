import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import {
  generateHouseholdKey,
  generateRecoveryCode,
  inviteLookup,
  unwrapWithInviteCode,
  unwrapWithPassphrase,
  unwrapWithRecoveryCode,
  wrapWithPassphrase,
  wrapWithRecoveryCode,
  WrongSecretError,
  type WrappedKey,
} from '../lib/crypto'
import { errorMessage, isConfigured, supabase } from '../lib/supabase'
import { Segmented } from '../components/Segmented'
import { LogoMark } from '../components/LogoMark'
import { useSession } from './session'

export const MIN_PASSWORD = 12
export const MIN_PASSPHRASE = 12

function Logo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 0 8px' }}>
      <div className="cat-icon" style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--primary)', color: '#fff' }}>
            <LogoMark height={42} />
      </div>
      <div className="num" style={{ fontWeight: 700, fontSize: 26, letterSpacing: '0.06em' }}>NAMI</div>
    </div>
  )
}

export function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, ...input } = props
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...input} />
    </div>
  )
}

export function ErrorBox({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div role="alert" className="notice notice--error">{children}</div>
}

function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="link" style={{ height: 44, border: 0, background: 'transparent', alignSelf: 'center' }}>
      {children}
    </button>
  )
}

/** Nessun accesso: Face ID oppure email e password. */
export function SignIn() {
  const [mode, setMode] = useState<'accedi' | 'crea'>('accedi')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<{ error: unknown }>) => {
    setBusy(true)
    setError(null)
    try {
      const { error } = await action()
      if (error) setError(errorMessage(error))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'crea' && password.length < MIN_PASSWORD) {
      setError(`La password deve avere almeno ${MIN_PASSWORD} caratteri.`)
      return
    }
    run(() =>
      mode === 'crea' ? supabase.auth.signUp({ email, password }) : supabase.auth.signInWithPassword({ email, password }),
    )
  }

  return (
    <div className="page page--plain">
      <Logo />
      {!isConfigured && <ErrorBox>L'app non è ancora collegata al database.</ErrorBox>}

      <button type="button" className="primary-btn" disabled={busy} onClick={() => run(() => supabase.auth.signInWithPasskey())}>
        Entra con Face ID
      </button>
      <div className="muted" style={{ textAlign: 'center', fontSize: 13 }}>oppure, la prima volta su questo dispositivo</div>

      <Segmented options={[['accedi', 'Accedi'], ['crea', 'Crea account']] as const} value={mode} onChange={setMode} />
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Email" id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label={mode === 'crea' ? `Password (almeno ${MIN_PASSWORD} caratteri)` : 'Password'}
          id="password"
          type="password"
          autoComplete={mode === 'crea' ? 'new-password' : 'current-password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorBox>{error}</ErrorBox>
        <button type="submit" className="secondary-btn" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'crea' ? 'Crea account' : 'Accedi'}
        </button>
      </form>
    </div>
  )
}

/** Mostra il kit di recupero una sola volta, poi apre l'app. */
export function RecoveryKit({ code, onDone }: { code: string; onDone: () => void | Promise<void> }) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
  }

  return (
    <div className="page page--plain">
      <h1 style={{ marginTop: 16 }}>Kit di recupero</h1>
      <div className="muted" style={{ lineHeight: 1.45 }}>
        Questo codice sblocca i dati se dimentichi la frase segreta. Lo vedi <b>solo adesso</b>: scrivilo su carta o salvalo
        nelle Password dell'iPhone.
      </div>
      <div className="card num" style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', lineHeight: 1.6, letterSpacing: '0.04em', wordSpacing: '0.3em' }}>
        {code.split('-').join(' ')}
      </div>
      <button type="button" className="secondary-btn" onClick={copy}>{copied ? 'Copiato' : 'Copia il codice'}</button>
      <div className="notice notice--warn">
        Senza frase segreta e senza kit di recupero i dati sono persi per sempre: nessuno, nemmeno noi, può recuperarli.
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, fontWeight: 600 }}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} style={{ width: 24, height: 24 }} />
        L'ho salvato in un posto sicuro
      </label>
      <div style={{ flexGrow: 1 }} />
      <button type="button" className="primary-btn" disabled={!saved} onClick={onDone}>Continua</button>
    </div>
  )
}

/** Accesso fatto ma nessuna coppia: creane una oppure entra con un invito. */
export function Onboarding() {
  const { unlock, signOut } = useSession()
  const [mode, setMode] = useState<'crea' | 'invito'>('crea')
  const [invite, setInvite] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ code: string; raw: Uint8Array<ArrayBuffer>; householdId: string } | null>(null)

  if (done) return <RecoveryKit code={done.code} onDone={() => unlock(done.raw, done.householdId)} />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (passphrase.length < MIN_PASSPHRASE) return setError(`La frase segreta deve avere almeno ${MIN_PASSPHRASE} caratteri.`)
    if (passphrase !== repeat) return setError('Le due frasi segrete non coincidono.')
    setBusy(true)
    setError(null)
    try {
      let raw: Uint8Array<ArrayBuffer>
      if (mode === 'crea') {
        raw = generateHouseholdKey()
      } else {
        const { data, error } = await supabase.rpc('get_invite', { p_lookup: inviteLookup(invite) })
        if (error) throw error
        if (!data) throw new Error('Invito non valido o scaduto: chiedine uno nuovo.')
        raw = await unwrapWithInviteCode(data as WrappedKey, invite)
      }
      const code = generateRecoveryCode()
      const keys = {
        p_wrapped_key: await wrapWithPassphrase(raw, passphrase),
        p_recovery_key: await wrapWithRecoveryCode(raw, code),
      }
      const { data: householdId, error } =
        mode === 'crea'
          ? await supabase.rpc('create_household', keys)
          : await supabase.rpc('join_household', { p_lookup: inviteLookup(invite), ...keys })
      if (error) throw error
      setDone({ code, raw, householdId: householdId as string })
    } catch (e) {
      setError(e instanceof WrongSecretError ? 'Codice d’invito errato: controlla i caratteri.' : errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--plain">
      <h1 style={{ marginTop: 16 }}>Benvenuto</h1>
      <Segmented options={[['crea', 'Crea la coppia'], ['invito', 'Ho un invito']] as const} value={mode} onChange={setMode} />
      <div className="muted" style={{ lineHeight: 1.45 }}>
        {mode === 'crea'
          ? 'Sei il primo dei due: scegli la frase segreta che protegge i dati. Poi potrai invitare il partner dalle Impostazioni.'
          : 'Scrivi il codice che il partner vede in Impostazioni → Invita il partner, e scegli la tua frase segreta.'}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'invito' && (
          <Field label="Codice d'invito" id="invito" autoCapitalize="characters" autoCorrect="off" required placeholder="XXXX-XXXX-XXXX-XXXX" value={invite} onChange={(e) => setInvite(e.target.value)} />
        )}
        <Field label={`Frase segreta (almeno ${MIN_PASSPHRASE} caratteri)`} id="frase" type="password" autoComplete="off" required value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
        <Field label="Ripeti la frase segreta" id="frase2" type="password" autoComplete="off" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        <div className="notice notice--warn">
          La frase segreta non viene mai inviata: se la dimentichi e perdi anche il kit di recupero, i dati non si possono recuperare.
        </div>
        <ErrorBox>{error}</ErrorBox>
        <button type="submit" className="primary-btn" disabled={busy}>
          {busy ? 'Preparo le chiavi…' : mode === 'crea' ? 'Crea la coppia' : 'Entra nella coppia'}
        </button>
      </form>
      <TextButton onClick={signOut}>Esci</TextButton>
    </div>
  )
}

/** Coppia esistente ma chiave non presente su questo dispositivo. */
export function Unlock() {
  const { member, unlock, signOut } = useSession()
  const [useKit, setUseKit] = useState(false)
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!member) return
    setBusy(true)
    setError(null)
    try {
      const raw = useKit
        ? await unwrapWithRecoveryCode(member.recovery_key, secret)
        : await unwrapWithPassphrase(member.wrapped_key, secret)
      await unlock(raw, member.household_id)
    } catch (e) {
      setError(e instanceof WrongSecretError ? (useKit ? 'Codice di recupero errato.' : 'Frase segreta errata.') : errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--plain">
      <Logo />
      <div className="muted" style={{ textAlign: 'center', lineHeight: 1.45 }}>
        {useKit
          ? 'Scrivi il codice del tuo kit di recupero.'
          : 'Scrivi la tua frase segreta. Serve una sola volta su questo dispositivo.'}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {useKit ? (
          <Field label="Kit di recupero" id="kit" autoCapitalize="characters" autoCorrect="off" required value={secret} onChange={(e) => setSecret(e.target.value)} />
        ) : (
          <Field label="Frase segreta" id="frase" type="password" autoComplete="off" required value={secret} onChange={(e) => setSecret(e.target.value)} />
        )}
        <ErrorBox>{error}</ErrorBox>
        <button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Sblocco…' : 'Sblocca'}</button>
      </form>
      <TextButton onClick={() => { setUseKit(!useKit); setSecret(''); setError(null) }}>
        {useKit ? 'Usa la frase segreta' : 'Ho dimenticato la frase: usa il kit di recupero'}
      </TextButton>
      <TextButton onClick={signOut}>Esci</TextButton>
    </div>
  )
}

/** Decide cosa mostrare prima dell'app vera e propria. */
export function Gate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useSession()
  if (error) {
    return (
      <div className="page page--plain">
        <Logo />
        <ErrorBox>{error}</ErrorBox>
        <button type="button" className="secondary-btn" onClick={retry}>Riprova</button>
      </div>
    )
  }
  if (status === 'loading') return <div className="page page--plain"><Logo /></div>
  if (status === 'signedOut') return <SignIn />
  if (status === 'noHousehold') return <Onboarding />
  if (status === 'locked') return <Unlock />
  return <>{children}</>
}
