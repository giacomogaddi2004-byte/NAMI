import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, ICONS } from '../components/Icon'
import { useData } from '../data/store'
import { today } from '../lib/dates'
import { buildExport, shareOrDownload } from '../lib/exportCsv'

/** Esportazione completa in CSV, da tenere come copia di sicurezza. */
export function Esporta() {
  const data = useData()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const files = buildExport(
    {
      accounts: data.accounts,
      txs: data.txs,
      piggyBanks: data.piggyBanks,
      piggyMoves: data.piggyMoves,
      budgets: data.budgets,
      recurrences: data.recurrences,
      rules: data.rules,
      settings: data.settings,
    },
    today(),
  )

  const run = async () => {
    setBusy(true)
    setDone(false)
    setError(null)
    try {
      setDone(await shareOrDownload(files))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Esportazione non riuscita.')
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
      <div>
        <h1>Esporta in CSV</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>
          Una copia leggibile di tutto, che si apre con Excel, Numbers o Fogli.
        </div>
      </div>

      <div className="notice notice--warn">
        I file non sono cifrati: chiunque li apra legge tutte le vostre cifre. Conservali in un posto sicuro e cancellali quando non servono più.
      </div>

      <div className="list">
        {files.map((f) => (
          <div key={f.name} className="list-row">
            <span className="grow">
              <span className="t">{f.name.replace(/^nami-|-\d{4}-\d{2}-\d{2}\.csv$/g, '').replace(/-/g, ' ')}</span>
              <span className="s">{f.rows} {f.rows === 1 ? 'riga' : 'righe'}</span>
            </span>
          </div>
        ))}
      </div>

      {done && <div className="notice notice--ok">Fatto. Su iPhone scegli “Salva su File”.</div>}
      {error && <div role="alert" className="notice notice--error">{error}</div>}
      <div style={{ flexGrow: 1 }} />
      <button type="button" className="primary-btn" onClick={run} disabled={busy}>
        {busy ? 'Preparo i file…' : 'Esporta tutto'}
      </button>
    </div>
  )
}
