// Budget mensili per categoria, avvisi all'80% e al 100%, e storico dei risparmi.
import type { CategoryKey } from '../data/categories'
import type { Account, Budget, PiggyMove, Tx, View } from '../data/model'
import { computeShares, monthSummary, savingsTotal } from './balances'
import { piggyAmount } from './piggy'
import { lastDayOfMonth, nextMonth } from './recurrences'

export type Level = 'ok' | 'near' | 'over'

/** Oltre questa quota del budget scatta il primo avviso. */
export const NEAR_RATIO = 0.8
/** I limiti proposti si arrotondano per eccesso a 10 €. */
const ROUND_TO = 1000
/** Per proporre i limiti si guardano al massimo gli ultimi 3 mesi chiusi. */
const SUGGEST_MONTHS = 3

export function level(spent: number, limit: number): Level {
  if (limit <= 0) return 'ok'
  if (spent >= limit) return 'over'
  return spent >= limit * NEAR_RATIO ? 'near' : 'ok'
}

/** Una nuova spesa fa scattare una soglia? Restituisce la più alta appena superata. */
export function crossed(before: number, after: number, limit: number): 'near' | 'over' | null {
  const b = level(before, limit)
  const a = level(after, limit)
  if (a === 'over' && b !== 'over') return 'over'
  if (a === 'near' && b === 'ok') return 'near'
  return null
}

export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** Gli ultimi `count` mesi fino a `month` compreso, dal più vecchio. */
export function monthsBack(month: string, count: number): string[] {
  const out = [month]
  while (out.length < count) out.unshift(prevMonth(out[0]))
  return out
}

export const monthEnd = (month: string) => `${month}-${String(lastDayOfMonth(month)).padStart(2, '0')}`

export { nextMonth }

/** Quanto è stato speso per categoria in un mese (tutta la coppia: i budget sono comuni). */
export function spentByCategory(txs: Tx[], month: string, accounts: Map<string, Account>): Map<CategoryKey, number> {
  return new Map(monthSummary(txs, month, accounts, 'coppia').byCategory)
}

/**
 * Limiti proposti dalla spesa reale: media dei mesi già chiusi (al massimo 3, non prima del primo
 * movimento), arrotondata per eccesso a 10 €. Vuoto se non c'è ancora un mese chiuso.
 */
export function suggestLimits(txs: Tx[], accounts: Map<string, Account>, today: string): Partial<Record<CategoryKey, number>> {
  const first = txs.reduce<string | null>((min, t) => (t.type === 'uscita' && (!min || t.date < min) ? t.date : min), null)
  if (!first) return {}
  const current = today.slice(0, 7)
  const months: string[] = []
  for (let m = prevMonth(current); months.length < SUGGEST_MONTHS && m >= first.slice(0, 7); m = prevMonth(m)) months.push(m)
  if (months.length === 0) return {}

  const totals = new Map<CategoryKey, number>()
  for (const m of months) {
    for (const [cat, cents] of spentByCategory(txs, m, accounts)) totals.set(cat, (totals.get(cat) ?? 0) + cents)
  }
  const out: Partial<Record<CategoryKey, number>> = {}
  for (const [cat, total] of totals) out[cat] = Math.ceil(total / months.length / ROUND_TO) * ROUND_TO
  return out
}

/** Quanto c'è tra conto deposito e salvadanai alla fine di un giorno. */
export function savingsAt(accounts: Account[], txs: Tx[], piggyMoves: PiggyMove[], day: string, view: View): number {
  const shares = computeShares(accounts, txs.filter((t) => t.date <= day))
  const piggy = piggyAmount(piggyMoves.filter((m) => m.date <= day), view)
  return savingsTotal(accounts, shares, view, piggy)
}

/** Totale dei budget attivi. */
export const budgetTotal = (budgets: Budget[]) => budgets.reduce((sum, b) => sum + b.limit, 0)
