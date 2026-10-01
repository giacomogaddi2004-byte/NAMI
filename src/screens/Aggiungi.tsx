import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CatIcon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { CAT, EXPENSE_CATEGORIES, INCOME_CATEGORIES, type CategoryKey } from '../data/categories'
import { formatEur, parseEur, TAX_PERCENT, taxShare } from '../lib/money'

const TYPES = [['uscita', 'Uscita'], ['entrata', 'Entrata'], ['giroconto', 'Giroconto']] as const
type TxType = (typeof TYPES)[number][0]

const SAVE_LABEL: Record<TxType, string> = { uscita: 'Salva spesa', entrata: 'Salva entrata', giroconto: 'Salva giroconto' }
const MERCHANT_LABEL: Record<TxType, string> = { uscita: 'Esercente', entrata: 'Da chi', giroconto: 'Descrizione' }

const smallLabel = { fontSize: 12, fontWeight: 600, color: 'var(--text-2)' } as const

export function Aggiungi() {
  const [type, setType] = useState<TxType>('uscita')
  const [amount, setAmount] = useState('42,80')
  const [merchant, setMerchant] = useState('Esselunga')
  const [expenseCat, setExpenseCat] = useState<CategoryKey>('supermercato')
  const [incomeCat, setIncomeCat] = useState<CategoryKey>('lavoro')

  const isIncome = type === 'entrata'
  const cents = parseEur(amount)
  // Finché non lo tocchi, l'interruttore Fattura è acceso solo per la categoria Lavoro.
  const [invoiceChoice, setInvoiceChoice] = useState<boolean | null>(null)
  const invoice = invoiceChoice ?? incomeCat === 'lavoro'
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const picked = isIncome ? incomeCat : expenseCat
  const pick = isIncome ? setIncomeCat : setExpenseCat

  return (
    <div className="page page--plain">
      <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 72px', alignItems: 'center' }}>
        <Link to="/" className="back">Annulla</Link>
        <div className="card-title" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Nuovo movimento</div>
      </div>

      <Segmented options={TYPES} value={type} onChange={setType} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0 2px' }}>
        <label htmlFor="importo" className="label">Importo</label>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <input
            id="importo"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="num"
            style={{ width: 210, border: 0, background: 'transparent', textAlign: 'right', fontWeight: 700, fontSize: 58, padding: 0, color: isIncome ? 'var(--positive)' : 'var(--text)' }}
          />
          <span className="num muted" style={{ fontWeight: 700, fontSize: 38 }}>€</span>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 18, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label htmlFor="esercente" style={smallLabel}>{MERCHANT_LABEL[type]}</label>
        <input
          id="esercente"
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          style={{ border: 0, background: 'transparent', fontSize: 17, fontWeight: 600, padding: '4px 0', height: 28 }}
        />
      </div>

      {type === 'giroconto' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Sposta tra i tuoi conti</div>
          {[['Da', 'Conto corrente'], ['A', 'Conto spese di coppia']].map(([label, account]) => (
            <button key={label} type="button" className="field-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: 16, fontWeight: 600 }}>
              <span className="muted" style={{ fontSize: 13 }}>{label}</span>
              <span>{account}</span>
            </button>
          ))}
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.4 }}>Un giroconto non conta né come spesa né come entrata.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row-between">
            <div style={{ fontSize: 14, fontWeight: 700 }}>Categoria</div>
            <div style={smallLabel}>{isIncome ? 'Entrate variabili' : `Proposta per ${merchant}`}</div>
          </div>
          <div className="cat-grid">
            {cats.map((k) => {
              const on = k === picked
              return (
                <button
                  key={k}
                  type="button"
                  className="cat-btn"
                  aria-pressed={on}
                  onClick={() => pick(k)}
                  style={on ? { borderColor: CAT[k].color, background: CAT[k].tint } : undefined}
                >
                  <CatIcon cat={k} box={34} radius={11} icon={20} background={on ? '#fff' : undefined} />
                  <span>{CAT[k].name}</span>
                </button>
              )
            })}
          </div>
          {isIncome && (
            <div style={{ background: '#fff', borderRadius: 18, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 60 }}>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Fattura</div>
                <div style={{ ...smallLabel, color: invoice ? 'var(--positive)' : 'var(--text-2)' }}>
                  {invoice
                    ? `${TAX_PERCENT}% al conto tasse${cents !== null ? `: ${formatEur(taxShare(cents))}` : ''}`
                    : 'Incasso senza fattura: niente al conto tasse'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={invoice}
                aria-label="Fattura"
                onClick={() => setInvoiceChoice(!invoice)}
                style={{ width: 52, height: 44, border: 0, background: 'transparent', padding: '6px 0', flexShrink: 0 }}
              >
                <span style={{ display: 'block', width: 52, height: 32, borderRadius: 16, background: invoice ? '#1F9D55' : '#C3C8D6', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 3, left: invoice ? 23 : 3, width: 26, height: 26, borderRadius: 13, background: '#fff', transition: 'left 0.15s' }} />
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {type !== 'giroconto' && (
          <button type="button" className="field-btn">
            <span style={{ ...smallLabel, display: 'block' }}>Conto</span>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Conto di coppia</span>
          </button>
        )}
        <button type="button" className="field-btn">
          <span style={{ ...smallLabel, display: 'block' }}>Data</span>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Oggi, 18 ottobre</span>
        </button>
      </div>

      <div style={{ flexGrow: 1 }} />
      <Link to="/" className="primary-btn">{SAVE_LABEL[type]}</Link>
    </div>
  )
}
