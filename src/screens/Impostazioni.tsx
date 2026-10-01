import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../auth/session'
import { disablePush, enablePush, pushState, showLocalTest, type PushState } from '../lib/push'
import { errorMessage, supabase } from '../lib/supabase'
import { Icon, ICONS } from '../components/Icon'
import { OWNER_LABEL, PEOPLE } from '../data/model'
import { useData } from '../data/store'
import { computeShares } from '../lib/balances'
import { formatEur } from '../lib/money'

const avatar = { width: 44, height: 44, borderRadius: 22, color: '#fff', fontWeight: 700, border: '3px solid #fff' } as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="section-title" style={{ paddingLeft: 4 }}>{title}</div>
      <div className="list">{children}</div>
    </div>
  )
}

function RowText({ title, sub, subStyle }: { title: string; sub: string; subStyle?: CSSProperties }) {
  return (
    <span className="grow">
      <span className="t">{title}</span>
      <span className="s" style={subStyle}>{sub}</span>
    </span>
  )
}

const chevron = <Icon d={ICONS.right} size={18} color="#8A90A6" width={2.2} />

/** Registra una passkey su questo dispositivo, per entrare con Face ID. */
function FaceIdRow() {
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.passkey.list().then(({ data }) => setCount(data?.length ?? 0))
  }, [])

  const register = async () => {
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.registerPasskey()
      if (error) throw error
      setCount((n) => (n ?? 0) + 1)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const sub = error ?? (count === null ? 'Controllo…' : count > 0 ? `Attivo · ${count} ${count === 1 ? 'dispositivo' : 'dispositivi'}` : 'Non ancora attivo su questo iPhone')
  return (
    <div className="list-row">
      <RowText title="Accesso con Face ID" sub={sub} subStyle={error ? { color: 'var(--over)', fontWeight: 600 } : count ? { color: 'var(--positive)', fontWeight: 600 } : undefined} />
      <button type="button" onClick={register} disabled={busy} className="link" style={{ height: 44, padding: '0 4px', border: 0, background: 'transparent', flexShrink: 0 }}>
        {busy ? '…' : count ? 'Aggiungi' : 'Attiva'}
      </button>
    </div>
  )
}

/** Avvisi mattutini per le spese fisse in scadenza. */
function NotificationsRow() {
  const { householdId } = useSession()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void pushState().then(setState)
  }, [])

  const toggle = async () => {
    if (!householdId) return
    setBusy(true)
    setError(null)
    try {
      if (state === 'on') await disablePush()
      else {
        await enablePush(householdId)
        await showLocalTest()
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setState(await pushState())
      setBusy(false)
    }
  }

  const sub =
    error ??
    (state === null
      ? 'Controllo…'
      : state === 'unsupported'
        ? 'Aggiungi NAMI alla schermata Home per riceverle'
        : state === 'blocked'
          ? 'Bloccate: attivale da Impostazioni dell’iPhone → NAMI'
          : state === 'on'
            ? 'Attive su questo iPhone · ogni mattina alle 8'
            : 'Un avviso al giorno quando scade una spesa fissa')
  const warn = !!error || state === 'blocked'

  return (
    <div className="list-row">
      <RowText title="Notifiche scadenze" sub={sub} subStyle={warn ? { color: 'var(--over)', fontWeight: 600 } : state === 'on' ? { color: 'var(--positive)', fontWeight: 600 } : undefined} />
      {(state === 'on' || state === 'off') && (
        <button type="button" onClick={toggle} disabled={busy} className="link" style={{ height: 44, padding: '0 4px', border: 0, background: 'transparent', flexShrink: 0 }}>
          {busy ? '…' : state === 'on' ? 'Disattiva' : 'Attiva'}
        </button>
      )}
    </div>
  )
}

export function Impostazioni() {
  const { user, signOut } = useSession()
  const { accounts, txs, rules, recurrences, me, pending, syncError, syncNow } = useData()
  const shares = computeShares(accounts, txs)
  const exit = () => {
    const warning = pending > 0 ? `Ci sono ${pending} modifiche non ancora inviate: uscendo andranno perse. ` : ''
    if (window.confirm(`${warning}Vuoi uscire? Al rientro servirà la frase segreta.`)) void signOut()
  }
  const fixedTotal = recurrences.reduce((sum, r) => sum + r.cents, 0)

  return (
    <div className="page page--plain">
      <Link to="/" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Home
      </Link>
      <h1>Impostazioni</h1>

      <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex' }}>
          <div className="cat-icon" style={{ ...avatar, background: PEOPLE.jack.color }}>J</div>
          <div className="cat-icon" style={{ ...avatar, background: PEOPLE.fiore.color, marginLeft: -12 }}>F</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Jack e Fiore</div>
          <div className="muted" style={{ fontSize: 13 }}>Vedete entrambi tutti i conti{me && ` · tu sei ${PEOPLE[me].name}`}</div>
        </div>
      </div>

      <Section title="Conti">
        {accounts.map((a) => {
          const s = shares.get(a.id)!
          const total = s.jack + s.fiore
          return (
            <Link key={a.id} to={`/conto/${a.id}`} className="list-row">
              <RowText title={a.name} sub={OWNER_LABEL[a.owner]} />
              <div className="tx-amount">{total < 0 && '−'}{formatEur(total)}</div>
              {chevron}
            </Link>
          )
        })}
      </Section>

      <Section title="Gestione">
        <Link to="/spese-fisse" className="list-row">
          <RowText title="Spese fisse" sub={`${recurrences.length} spese · ${formatEur(fixedTotal)} al mese`} />
          {chevron}
        </Link>
        <Link to="/regole" className="list-row">
          <RowText title="Categorie e regole" sub={`${rules.length} ${rules.length === 1 ? 'regola vostra' : 'regole vostre'} · esercente → categoria`} />
          {chevron}
        </Link>
        <Link to="/statistiche" className="list-row">
          <RowText title="Budget mensili" sub="Avvisi all'80% e al 100%" />
          {chevron}
        </Link>
        <button type="button" className="list-row">
          <RowText title="Comando Apple Pay" sub="Arriva con la Fase 8" />
          {chevron}
        </button>
      </Section>

      <Section title="Sicurezza e dati">
        <div className="list-row">
          <RowText
            title="Sincronizzazione"
            sub={syncError ?? (pending > 0 ? `${pending} modifiche da inviare` : 'Tutto salvato sul server')}
            subStyle={syncError || pending > 0 ? { color: '#8A4B00', fontWeight: 600 } : undefined}
          />
          <button type="button" onClick={syncNow} className="link" style={{ height: 44, padding: '0 4px', border: 0, background: 'transparent', flexShrink: 0 }}>
            Aggiorna
          </button>
        </div>
        <FaceIdRow />
        <NotificationsRow />
        <Link to="/invita" className="list-row">
          <RowText title="Invita il partner" sub="Codice monouso, valido 15 minuti" />
          {chevron}
        </Link>
        <div className="list-row">
          <RowText title="Cifratura totale" sub="I dati lasciano il telefono già cifrati" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--positive)', background: '#DFF3E7', borderRadius: 8, padding: '4px 8px' }}>Attiva</span>
        </div>
        <button type="button" className="list-row">
          <RowText title="Kit di recupero" sub="Conservalo: senza, i dati non si recuperano" subStyle={{ color: '#8A4B00', fontWeight: 600 }} />
          {chevron}
        </button>
        <button type="button" className="list-row">
          <RowText title="Esporta tutto in CSV" sub="Backup leggibile, da tenere al sicuro" />
          <Icon d={ICONS.download} size={20} color="#2B50E0" width={2.2} />
        </button>
        <button type="button" className="list-row" onClick={exit}>
          <RowText title="Esci" sub={`${user?.email ?? ''} · al rientro servirà la frase segreta`} />
        </button>
      </Section>

      <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
        NAMI {__APP_VERSION__} · Salvadanai e Statistiche sono ancora di esempio
      </div>
    </div>
  )
}
