import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, Field } from '../auth/screens'
import { fetchMember, useSession } from '../auth/session'
import { Icon, ICONS } from '../components/Icon'
import { generateInviteCode, inviteLookup, unwrapWithPassphrase, wrapWithInviteCode, WrongSecretError } from '../lib/crypto'
import { errorMessage, supabase } from '../lib/supabase'

/** Crea un invito monouso che consegna la chiave di coppia al partner. */
export function Invita() {
  const { user } = useSession()
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      // La chiave salvata sul dispositivo non è leggibile: per consegnarla serve di nuovo la frase segreta.
      const member = await fetchMember(user.id)
      if (!member) throw new Error('Non fai ancora parte di una coppia.')
      const raw = await unwrapWithPassphrase(member.wrapped_key, passphrase)
      const newCode = generateInviteCode()
      const { error } = await supabase.from('invites').insert({
        lookup: inviteLookup(newCode),
        household_id: member.household_id,
        wrapped_key: await wrapWithInviteCode(raw, newCode),
      })
      if (error) throw error
      setPassphrase('')
      setCode(newCode)
    } catch (e) {
      setError(e instanceof WrongSecretError ? 'Frase segreta errata.' : errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--plain">
      <Link to="/impostazioni" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Impostazioni
      </Link>
      <h1>Invita il partner</h1>

      {code ? (
        <>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Il partner apre NAMI sul suo iPhone, crea il suo account, sceglie <b>Ho un invito</b> e scrive questo codice.
          </div>
          <div className="card num" style={{ fontSize: 26, fontWeight: 700, textAlign: 'center', letterSpacing: '0.04em', lineHeight: 1.5 }}>
            {code.slice(0, 9)}
            <br />
            {code.slice(10)}
          </div>
          <div className="notice notice--warn">Vale 15 minuti e si può usare una volta sola. Non mandarlo per messaggio: dettalo o mostralo di persona.</div>
        </>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Per creare l'invito scrivi la tua frase segreta: serve a consegnare al partner la chiave che apre i dati di coppia.
          </div>
          <Field label="La tua frase segreta" id="frase" type="password" autoComplete="off" required value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          <ErrorBox>{error}</ErrorBox>
          <button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Preparo l’invito…' : 'Crea codice d’invito'}</button>
        </form>
      )}
    </div>
  )
}
