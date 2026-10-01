// Regole "esercente → categoria": prima quelle della coppia, poi l'elenco iniziale.
import type { CategoryKey } from '../data/categories'
import { BUILTIN_MERCHANTS } from '../data/merchants'
import type { Rule, Tx } from '../data/model'

/** "ESSELUNGA S.p.A. – Milano" → "esselunga s p a milano" */
export function normalizeMerchant(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Il nome contiene la regola come parole intere? ("ip" non deve riconoscere "equipe".) */
export function matches(normalizedName: string, pattern: string): boolean {
  return pattern !== '' && ` ${normalizedName} `.includes(` ${pattern} `)
}

const BUILTIN: { pattern: string; category: CategoryKey }[] = Object.entries(BUILTIN_MERCHANTS)
  .flatMap(([category, names]) => names.map((name) => ({ pattern: normalizeMerchant(name), category: category as CategoryKey })))
  // Le regole più lunghe vincono: "conad carburanti" prima di "conad".
  .sort((a, b) => b.pattern.length - a.pattern.length)

export const BUILTIN_COUNT = BUILTIN.length

/** Categoria proposta per un esercente, o null se è sconosciuto. */
export function categoryFor(merchant: string, rules: Rule[]): CategoryKey | null {
  const name = normalizeMerchant(merchant)
  if (!name) return null
  const mine = [...rules].sort((a, b) => b.pattern.length - a.pattern.length).find((r) => matches(name, r.pattern))
  return mine?.category ?? BUILTIN.find((r) => matches(name, r.pattern))?.category ?? null
}

/** Uscite passate dello stesso esercente con un'altra categoria (o ancora da controllare). */
export function sameMerchant(txs: Tx[], merchant: string, category: CategoryKey, exceptId?: string): Tx[] {
  const pattern = normalizeMerchant(merchant)
  return txs.filter(
    (t) => t.type === 'uscita' && t.id !== exceptId && (t.category !== category || t.review) && matches(normalizeMerchant(t.merchant), pattern),
  )
}
