import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, ICONS } from '../components/Icon'
import { ACCOUNTS, FIXED } from '../data/mock'
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

export function Impostazioni() {
  const fixed = FIXED.flatMap((d) => d.rows)
  const fixedTotal = fixed.reduce((a, r) => a + r.cents, 0)

  return (
    <div className="page page--plain">
      <Link to="/" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Home
      </Link>
      <h1>Impostazioni</h1>

      <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex' }}>
          <div className="cat-icon" style={{ ...avatar, background: 'var(--primary)' }}>Tu</div>
          <div className="cat-icon" style={{ ...avatar, background: 'var(--plus)', marginLeft: -12 }}>P</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Tu e il partner</div>
          <div className="muted" style={{ fontSize: 13 }}>Vedete entrambi tutti i conti</div>
        </div>
      </div>

      <Section title="Conti">
        {ACCOUNTS.map((a) => (
          <div key={a.name} className="list-row">
            <RowText title={a.name} sub={a.owner} />
            <div className="tx-amount">{formatEur(a.cents)}</div>
          </div>
        ))}
        <button type="button" className="list-row" style={{ fontWeight: 600, color: 'var(--primary)' }}>+ Aggiungi conto</button>
      </Section>

      <Section title="Gestione">
        <Link to="/spese-fisse" className="list-row">
          <RowText title="Spese fisse" sub={`${fixed.length} spese · ${formatEur(fixedTotal)} al mese`} />
          {chevron}
        </Link>
        <button type="button" className="list-row">
          <RowText title="Categorie e regole" sub="12 categorie · esercente → categoria" />
          {chevron}
        </button>
        <Link to="/statistiche" className="list-row">
          <RowText title="Budget mensili" sub="Avvisi all'80% e al 100%" />
          {chevron}
        </Link>
        <button type="button" className="list-row">
          <RowText title="Comando Apple Pay" sub="Attivo su 2 iPhone" subStyle={{ color: 'var(--positive)', fontWeight: 600 }} />
          {chevron}
        </button>
      </Section>

      <Section title="Sicurezza e dati">
        <div className="list-row">
          <RowText title="Accesso con Face ID" sub="Passkey su questo iPhone" />
          <button type="button" role="switch" aria-checked="true" aria-label="Accesso con Face ID" style={{ width: 52, height: 32, borderRadius: 16, border: 0, background: '#1F9D55', position: 'relative', padding: 0 }}>
            <span style={{ position: 'absolute', top: 3, right: 3, width: 26, height: 26, borderRadius: 13, background: '#fff' }} />
          </button>
        </div>
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
      </Section>

      <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
        NAMI {__APP_VERSION__} · versione di prova con dati di esempio
      </div>
    </div>
  )
}
