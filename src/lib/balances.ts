// Saldi e totali, calcolati sul telefono a partire dai movimenti.
import type { CategoryKey } from '../data/categories'
import type { Account, PersonKey, Tx, View } from '../data/model'

export type Shares = Record<PersonKey, number>

/** Un conto "di entrambi" tiene distinte le quote di Jack e di Fiore. */
export const isSplit = (a: Account) => a.owner === 'entrambi'

/** Il saldo disponibile conta solo conti correnti e contanti (non deposito né tasse). */
export const countsInAvailable = (a: Account) => a.kind === 'corrente' || a.kind === 'contanti'

/** Di chi è la quota toccata da un movimento su un certo conto. */
export function personOn(account: Account, tx: Tx, side: 'from' | 'to'): PersonKey {
  if (account.owner !== 'entrambi') return account.owner
  return side === 'to' ? (tx.toWho ?? tx.who) : tx.who
}

/** Effetto di un movimento su un conto: negativo se i soldi escono, positivo se entrano, 0 se non lo riguarda. */
export function effectOn(accountId: string, tx: Tx): { cents: number; side: 'from' | 'to' }[] {
  const out: { cents: number; side: 'from' | 'to' }[] = []
  if (tx.accountId === accountId) out.push({ cents: tx.type === 'entrata' ? tx.cents : -tx.cents, side: 'from' })
  if (tx.type === 'giroconto' && tx.toAccountId === accountId) out.push({ cents: tx.cents, side: 'to' })
  return out
}

/** Quote di Jack e di Fiore su ogni conto. */
export function computeShares(accounts: Account[], txs: Tx[]): Map<string, Shares> {
  const byId = new Map(accounts.map((a) => [a.id, a]))
  const shares = new Map<string, Shares>()
  for (const a of accounts) {
    shares.set(a.id, isSplit(a) ? { ...a.opening } : { jack: 0, fiore: 0, [a.owner]: a.opening[a.owner as PersonKey] })
  }
  for (const tx of txs) {
    const from = byId.get(tx.accountId)
    if (from) shares.get(from.id)![personOn(from, tx, 'from')] += tx.type === 'entrata' ? tx.cents : -tx.cents
    const to = tx.type === 'giroconto' && tx.toAccountId ? byId.get(tx.toAccountId) : undefined
    if (to) shares.get(to.id)![personOn(to, tx, 'to')] += tx.cents
  }
  return shares
}

export function viewAmount(shares: Shares, view: View): number {
  return view === 'coppia' ? shares.jack + shares.fiore : shares[view]
}

function sumWhere(accounts: Account[], shares: Map<string, Shares>, view: View, keep: (a: Account) => boolean): number {
  return accounts.filter(keep).reduce((sum, a) => sum + viewAmount(shares.get(a.id)!, view), 0)
}

/** Saldo disponibile = conti correnti e contanti, meno i soldi nei salvadanai. */
export function availableBalance(accounts: Account[], shares: Map<string, Shares>, view: View, inPiggyBanks = 0): number {
  return sumWhere(accounts, shares, view, countsInAvailable) - inPiggyBanks
}

/** Totale risparmi = conto deposito + soldi nei salvadanai. */
export function savingsTotal(accounts: Account[], shares: Map<string, Shares>, view: View, inPiggyBanks = 0): number {
  return sumWhere(accounts, shares, view, (a) => a.kind === 'deposito') + inPiggyBanks
}

export function taxTotal(accounts: Account[], shares: Map<string, Shares>, view: View): number {
  return sumWhere(accounts, shares, view, (a) => a.kind === 'tasse')
}

/** Il movimento riguarda la vista scelta? (Per la coppia sempre; per una persona, se la quota è sua.) */
export function inView(tx: Tx, accounts: Map<string, Account>, view: View): boolean {
  if (view === 'coppia') return true
  const from = accounts.get(tx.accountId)
  const to = tx.toAccountId ? accounts.get(tx.toAccountId) : undefined
  return (!!from && personOn(from, tx, 'from') === view) || (!!to && personOn(to, tx, 'to') === view)
}

export interface MonthSummary {
  income: number
  spent: number
  byCategory: [CategoryKey, number][]
}

/** Entrate e uscite di un mese ("AAAA-MM"). I giroconti non contano. */
export function monthSummary(txs: Tx[], month: string, accounts: Map<string, Account>, view: View): MonthSummary {
  const byCat = new Map<CategoryKey, number>()
  let income = 0
  let spent = 0
  for (const tx of txs) {
    if (!tx.date.startsWith(month) || tx.type === 'giroconto' || !inView(tx, accounts, view)) continue
    if (tx.type === 'entrata') {
      income += tx.cents
    } else {
      spent += tx.cents
      const cat = tx.category ?? 'altro'
      byCat.set(cat, (byCat.get(cat) ?? 0) + tx.cents)
    }
  }
  return { income, spent, byCategory: [...byCat.entries()].sort((a, b) => b[1] - a[1]) }
}
