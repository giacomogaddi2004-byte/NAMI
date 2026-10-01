import { Link } from 'react-router-dom'
import { CatIcon, Icon, ICONS } from '../components/Icon'
import { CAT, EXPENSE_CATEGORIES, type CategoryKey } from '../data/categories'
import { BUILTIN_MERCHANTS } from '../data/merchants'
import { useData } from '../data/store'
import { BUILTIN_COUNT } from '../lib/rules'

/** Regole esercente → categoria: quelle della coppia (modificabili) e l'elenco iniziale. */
export function Regole() {
  const { rules, saveRule, deleteRule } = useData()

  return (
    <div className="page page--plain">
      <Link to="/impostazioni" className="back">
        <Icon d={ICONS.left} size={20} width={2.2} />
        Impostazioni
      </Link>
      <div>
        <h1>Categorie e regole</h1>
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
          Quando scrivi un esercente, NAMI propone la categoria. Le vostre regole vincono sull'elenco iniziale.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="section-title" style={{ paddingLeft: 4 }}>Le vostre regole</div>
        <div className="list">
          {rules.length === 0 && (
            <div className="list-row muted" style={{ fontSize: 14, lineHeight: 1.4, padding: '12px 0' }}>
              Ancora nessuna. Nascono da sole: cambia la categoria di una spesa e rispondi “sì” a “Usarla sempre?”.
            </div>
          )}
          {rules.map((rule) => (
            <div key={rule.id} className="list-row">
              <CatIcon cat={rule.category} box={40} radius={13} icon={21} />
              <span className="grow">
                <span className="t">{rule.label}</span>
                <select
                  aria-label={`Categoria per ${rule.label}`}
                  value={rule.category}
                  onChange={(e) => void saveRule({ ...rule, category: e.target.value as CategoryKey })}
                  className="plain-select"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', minHeight: 28 }}
                >
                  {EXPENSE_CATEGORIES.map((k) => (
                    <option key={k} value={k}>{CAT[k].name}</option>
                  ))}
                </select>
              </span>
              <button
                type="button"
                aria-label={`Elimina la regola per ${rule.label}`}
                onClick={() => window.confirm(`Eliminare la regola per ${rule.label}?`) && void deleteRule(rule)}
                className="cat-icon"
                style={{ width: 44, height: 44, border: 0, borderRadius: 12, background: 'transparent', color: 'var(--over)' }}
              >
                <Icon d={ICONS.trash} size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="section-title" style={{ paddingLeft: 4 }}>Elenco iniziale · {BUILTIN_COUNT} esercenti</div>
        <div className="list">
          {EXPENSE_CATEGORIES.filter((k) => BUILTIN_MERCHANTS[k]).map((k) => (
            <div key={k} className="list-row" style={{ alignItems: 'flex-start', padding: '12px 0' }}>
              <CatIcon cat={k} box={40} radius={13} icon={21} />
              <span className="grow">
                <span className="t">{CAT[k].name}</span>
                <span className="s" style={{ lineHeight: 1.45, textTransform: 'capitalize' }}>{BUILTIN_MERCHANTS[k]!.join(' · ')}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
