import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox } from '../auth/screens'
import { CatIcon, Icon, ICONS } from '../components/Icon'
import type { Recurrence } from '../data/model'
import { useData } from '../data/store'
import { addDays, monthName, today } from '../lib/dates'
import { formatEur } from '../lib/money'
import { dueDate, nextDue, occurrenceKey, parseRecurrences } from '../lib/recurrences'

const IMPORT_EXAMPLE = '1; Affitto; 600,00; Casa e bollette\n1; Abbonamenti; 0; Abbonamenti\n-; Film; 8,99\n-; Musica; 10,99'

/** "20 ottobre" */
const dayAndMonth = (date: string) => `${Number(date.slice(8))} ${monthName(date)}`

export function SpeseFisse() {
  const { recurrences, occurrences } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const now = today()

  const monthly = recurrences.reduce((sum, r) => sum + r.cents, 0)
  const upcoming = recurrences.map((rec) => ({ rec, due: nextDue(rec, now) })).sort((a, b) => a.due.localeCompare(b.due))[0]
  const days = [...new Set(recurrences.map((r) => r.day))]

  const status = (rec: Recurrence) => {
    const due = dueDate(now.slice(0, 7), rec.day)
    return occurrences.has(occurrenceKey(rec.id, due))
      ? { text: `Registrata il ${dayAndMonth(due)}`, done: true }
      : { text: `In arrivo il ${dayAndMonth(nextDue(rec, now))}`, done: false }
  }

  return (
    <div className="page page--plain">
      <Link to="/impostazioni" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Impostazioni
      </Link>
      <div>
        <h1>Spese fisse</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Registrate in automatico alla scadenza</div>
      </div>

      <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 22, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#DCE3FF' }}>Ogni mese</div>
          <div className="num" style={{ fontSize: 30, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatEur(monthly)}</div>
        </div>
        {upcoming && (
          <div style={{ textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#DCE3FF' }}>Prossima</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{upcoming.rec.name}</div>
            <div style={{ fontSize: 13, color: '#DCE3FF' }}>{dayAndMonth(upcoming.due)} · {formatEur(upcoming.rec.cents)}</div>
          </div>
        )}
      </div>

      {recurrences.length === 0 && !importing && (
        <div className="muted" style={{ lineHeight: 1.45 }}>
          Ancora nessuna spesa fissa. Aggiungile una alla volta, oppure tocca <b>Importa elenco</b> per incollarle tutte insieme.
        </div>
      )}

      {days.map((day) => {
        const rows = recurrences.filter((r) => r.day === day)
        return (
          <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row-between" style={{ padding: '4px 4px 0' }}>
              <div className="section-title">Giorno {day}</div>
              <div className="label" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEur(rows.reduce((sum, r) => sum + r.cents, 0))}</div>
            </div>
            <div className="list">
              {rows.map((rec) => {
                const s = status(rec)
                const expanded = open === rec.id
                return (
                  <div key={rec.id} className="list-row" style={{ display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64 }}>
                      <Link to={`/spesa-fissa/${rec.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flexGrow: 1, minWidth: 0, minHeight: 64, color: 'inherit' }}>
                        <CatIcon cat={rec.category} box={40} radius={13} icon={21} />
                        <div className="grow">
                          <div className="tx-name">{rec.name}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: s.done ? 'var(--positive)' : 'var(--text-2)' }}>{s.text}</div>
                        </div>
                        <div className="tx-amount">{formatEur(rec.cents)}</div>
                      </Link>
                      {rec.subs && (
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : rec.id)}
                          aria-expanded={expanded}
                          aria-label={`Mostra i dettagli di ${rec.name}`}
                          className="cat-icon"
                          style={{ width: 44, height: 44, border: 0, borderRadius: 12, background: '#F1F2F7', color: 'var(--text-3)' }}
                        >
                          <Icon d={expanded ? ICONS.up : ICONS.down} size={18} width={2.4} />
                        </button>
                      )}
                    </div>
                    {rec.subs && expanded && (
                      <div style={{ margin: '0 0 12px 52px', background: '#FBF2F7', borderRadius: 14, padding: '6px 12px' }}>
                        {rec.subs.map((sub) => (
                          <div key={sub.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 34, fontSize: 14 }}>
                            <span>{sub.name}</span>
                            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatEur(sub.cents)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <Link to="/spesa-fissa/nuova" className="dashed-btn" style={{ height: 56, borderRadius: 18 }}>+ Aggiungi spesa fissa</Link>
      {importing ? (
        <ImportForm onDone={() => setImporting(false)} />
      ) : (
        <button type="button" className="link" onClick={() => setImporting(true)} style={{ height: 44, border: 0, background: 'transparent', alignSelf: 'center' }}>
          Importa elenco
        </button>
      )}
    </div>
  )
}

/** Incolla un elenco di spese fisse, una per riga. */
function ImportForm({ onDone }: { onDone: () => void }) {
  const { accounts, me, saveRecurrences } = useData()
  const defaultAccount = accounts.find((a) => a.owner === 'jack' && a.kind === 'corrente') ?? accounts[0]
  const [text, setText] = useState('')
  const [accountId, setAccountId] = useState(defaultAccount?.id ?? '')
  const [errors, setErrors] = useState<string[]>([])

  const submit = async () => {
    const parsed = parseRecurrences(text)
    if (parsed.errors.length > 0) return setErrors(parsed.errors)
    if (parsed.items.length === 0) return setErrors(['Incolla almeno una riga.'])
    // Si parte da domani: i saldi di oggi tengono già conto di quello che è stato pagato.
    const start = addDays(today(), 1)
    await saveRecurrences(parsed.items.map((item) => ({ ...item, id: crypto.randomUUID(), accountId, who: me ?? 'jack', start })))
    onDone()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
        Una spesa per riga: <b>giorno; nome; importo; categoria</b>. Una riga che inizia con “-” è un dettaglio della spesa sopra.
      </div>
      <textarea
        aria-label="Elenco delle spese fisse"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={IMPORT_EXAMPLE}
        rows={10}
        style={{ border: '1px solid var(--border)', borderRadius: 18, padding: 14, fontFamily: 'inherit', fontSize: 16, lineHeight: 1.4, resize: 'vertical' }}
      />
      <label className="field-btn" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Dal conto</span>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="plain-select">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>
      <ErrorBox>{errors.length > 0 && errors.map((e) => <div key={e}>{e}</div>)}</ErrorBox>
      <button type="button" className="primary-btn" onClick={submit}>Importa</button>
      <button type="button" className="link" onClick={onDone} style={{ height: 44, border: 0, background: 'transparent', alignSelf: 'center' }}>Annulla</button>
    </div>
  )
}
