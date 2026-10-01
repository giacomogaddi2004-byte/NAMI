import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox } from '../auth/screens'
import { useSession } from '../auth/session'
import { Icon, ICONS } from '../components/Icon'
import { useData } from '../data/store'
import { hashToken, newShortcutToken } from '../lib/arrivals'
import { errorMessage, SUPABASE_URL, supabase } from '../lib/supabase'

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/apple-pay`

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderTop: n > 1 ? '1px solid var(--line)' : undefined }}>
      <div className="cat-icon" style={{ width: 28, height: 28, borderRadius: 14, background: '#E4EAFD', color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>{n}</div>
      <div style={{ flexGrow: 1, minWidth: 0, fontSize: 14, lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

const code = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, background: '#F1F2F7', borderRadius: 6, padding: '1px 5px', wordBreak: 'break-all' } as const

/** Il Comando personale di Apple Pay: codice segreto, prova e istruzioni. */
export function ApplePay() {
  const { user, householdId } = useSession()
  const { settings, accounts, saveSettings } = useData()
  const [since, setSince] = useState<string | null | undefined>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('shortcut_tokens').select('created_at').eq('user_id', user.id).maybeSingle()
    setSince(data ? (data.created_at as string) : null)
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const create = async () => {
    if (!user || !householdId) return
    if (since && !window.confirm('Il vecchio codice smetterà di funzionare: dovrai aggiornarlo nel Comando. Continuare?')) return
    setBusy(true)
    setMessage(null)
    try {
      const fresh = newShortcutToken()
      const { error } = await supabase
        .from('shortcut_tokens')
        .upsert({ user_id: user.id, household_id: householdId, token_hash: await hashToken(fresh), created_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw error
      setToken(fresh)
      await load()
    } catch (e) {
      setMessage({ text: errorMessage(e), ok: false })
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!user || !window.confirm('Disattivare il Comando? I pagamenti smetteranno di arrivare.')) return
    await supabase.from('shortcut_tokens').delete().eq('user_id', user.id)
    setToken(null)
    await load()
  }

  const copy = async (what: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(what)
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000)
  }

  const test = async () => {
    if (!token) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, amount: '1,00 €', merchant: 'Prova NAMI', card: 'Carta di prova' }),
      })
      const body = await res.json().catch(() => ({}))
      setMessage(res.ok ? { text: 'Prova inviata: tra poco compare in Movimenti, in “Arrivi da Apple Pay”.', ok: true } : { text: body.error ?? `Errore ${res.status}`, ok: false })
    } catch (e) {
      setMessage({ text: errorMessage(e), ok: false })
    } finally {
      setBusy(false)
    }
  }

  const cards = Object.entries(settings?.cards ?? {})
  const forget = (card: string) => {
    const next = { ...settings?.cards }
    delete next[card]
    if (settings) void saveSettings({ ...settings, cards: next })
  }

  return (
    <div className="page page--plain">
      <Link to="/impostazioni" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Impostazioni
      </Link>
      <div>
        <h1>Comando Apple Pay</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>
          A ogni pagamento con Apple Pay, il tuo iPhone manda a NAMI importo, esercente e carta. Tu confermi con un tocco.
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card-title">Il tuo codice</div>
        {since === undefined && <div className="muted">Controllo…</div>}
        {since === null && (
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.45 }}>
            Non ancora creato. Il codice è personale: serve al Comando per farsi riconoscere. Sul server resta solo la sua impronta.
          </div>
        )}
        {since && !token && (
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--positive)' }}>
            Attivo dal {new Date(since).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' })}
          </div>
        )}
        {token && (
          <>
            <div className="notice notice--warn">Copialo adesso e incollalo nel Comando: per sicurezza non potrai rivederlo.</div>
            <div className="num" style={{ ...code, fontSize: 14, padding: '10px 12px', lineHeight: 1.4 }}>{token}</div>
            <button type="button" className="secondary-btn" onClick={() => void copy('token', token)}>{copied === 'token' ? 'Copiato' : 'Copia il codice'}</button>
            <button type="button" className="secondary-btn" onClick={test} disabled={busy}>Invia un arrivo di prova</button>
          </>
        )}
        <ErrorBox>{message && !message.ok ? message.text : null}</ErrorBox>
        {message?.ok && <div className="notice notice--ok">{message.text}</div>}
        <button type="button" className={since ? 'secondary-btn' : 'primary-btn'} onClick={create} disabled={busy}>
          {since ? 'Crea un nuovo codice' : 'Crea il mio codice'}
        </button>
        {since && (
          <button type="button" className="link" onClick={disable} style={{ height: 44, border: 0, background: 'transparent', color: 'var(--over)' }}>
            Disattiva
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 4 }}>Come creare il Comando</div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 6 }}>
          Sull'iPhone di chi usa questo codice. I nomi dei menu possono variare un po' con la versione di iOS: se non trovi una voce, mandami uno screenshot.
        </div>
        <Step n={1}>Genera il codice qui sopra e copialo, insieme all'indirizzo:
          <div style={{ marginTop: 6 }}><span style={code}>{FUNCTION_URL}</span></div>
          <button type="button" className="link" onClick={() => void copy('url', FUNCTION_URL)} style={{ height: 44, border: 0, background: 'transparent', padding: 0 }}>{copied === 'url' ? 'Copiato' : 'Copia l’indirizzo'}</button>
        </Step>
        <Step n={2}>Apri l'app <b>Comandi</b> → scheda <b>Automazione</b> → <b>+</b> (nuova automazione).</Step>
        <Step n={3}>Scegli <b>Transazione</b> e seleziona le carte di cui vuoi ricevere i pagamenti. Conferma con <b>Avanti</b>.</Step>
        <Step n={4}>Scegli <b>Nuovo comando vuoto</b> → <b>Aggiungi azione</b> → cerca <b>Ottieni contenuti dell'URL</b>.</Step>
        <Step n={5}>Nel campo <b>URL</b> incolla l'indirizzo. Tocca la freccia per aprire le opzioni: <b>Metodo = POST</b>, <b>Corpo della richiesta = JSON</b>.</Step>
        <Step n={6}>Aggiungi quattro campi di tipo <b>Testo</b>: <span style={code}>token</span> (incolla il tuo codice), <span style={code}>amount</span>, <span style={code}>merchant</span>, <span style={code}>card</span>. Per gli ultimi tre tocca il valore e scegli la variabile dell'input della transazione: <b>Importo</b>, <b>Esercente</b>, <b>Carta o pass</b>.</Step>
        <Step n={7}>Torna indietro e imposta <b>Esegui immediatamente</b> (non “Chiedi prima”). Salva.</Step>
        <Step n={8}>Fai un pagamento vero di prova: dopo qualche secondo deve comparire un arrivo in <b>Movimenti</b>.</Step>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.45, paddingTop: 6 }}>
          Se l'automazione scatta anche su un pagamento rifiutato, basta scorrere l'arrivo a sinistra per eliminarlo.
        </div>
      </div>

      {cards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="section-title" style={{ paddingLeft: 4 }}>Carte riconosciute</div>
          <div className="list">
            {cards.map(([card, accountId]) => (
              <div key={card} className="list-row">
                <span className="grow">
                  <span className="t">{card}</span>
                  <span className="s">{accounts.find((a) => a.id === accountId)?.name ?? 'conto eliminato'}</span>
                </span>
                <button type="button" className="link" onClick={() => forget(card)} style={{ height: 44, border: 0, background: 'transparent', color: 'var(--over)' }}>
                  Dimentica
                </button>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 13, paddingLeft: 4 }}>La prossima volta NAMI ti chiederà di nuovo il conto per quella carta.</div>
        </div>
      )}
    </div>
  )
}
