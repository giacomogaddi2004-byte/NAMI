import { describe, expect, it } from 'vitest'
import type { Account, Tx } from '../data/model'
import { availableBalance, computeShares, effectOn, inView, monthSummary, savingsTotal, taxTotal } from './balances'

const acc = (id: string, kind: Account['kind'], owner: Account['owner'], jack = 0, fiore = 0): Account => ({
  id, name: id, kind, owner, opening: { jack, fiore }, order: 0,
})

const accounts = [
  acc('corrente', 'corrente', 'jack', 100000),
  acc('coppia', 'corrente', 'jack', 20000),
  acc('fiore', 'corrente', 'fiore', 0, 50000),
  acc('contanti', 'contanti', 'entrambi', 3000, 2000),
  acc('deposito', 'deposito', 'entrambi', 100000, 200000),
  acc('tasse', 'tasse', 'entrambi'),
]
const byId = new Map(accounts.map((a) => [a.id, a]))

let n = 0
const tx = (t: Partial<Tx> & Pick<Tx, 'type' | 'cents' | 'accountId'>): Tx => ({
  id: `t${++n}`, date: '2026-10-05', merchant: 'x', who: 'jack', ...t,
})

describe('saldi dei conti', () => {
  it('senza movimenti valgono i saldi iniziali', () => {
    const s = computeShares(accounts, [])
    expect(s.get('corrente')).toEqual({ jack: 100000, fiore: 0 })
    expect(s.get('contanti')).toEqual({ jack: 3000, fiore: 2000 })
    expect(availableBalance(accounts, s, 'coppia')).toBe(175000)
    expect(availableBalance(accounts, s, 'jack')).toBe(123000)
    expect(availableBalance(accounts, s, 'fiore')).toBe(52000)
  })

  it('deposito e tasse restano fuori dal saldo disponibile', () => {
    const s = computeShares(accounts, [])
    expect(savingsTotal(accounts, s, 'coppia')).toBe(300000)
    expect(savingsTotal(accounts, s, 'fiore')).toBe(200000)
    expect(taxTotal(accounts, s, 'coppia')).toBe(0)
  })

  it('i salvadanai tolgono dal disponibile e si sommano ai risparmi', () => {
    const s = computeShares(accounts, [])
    expect(availableBalance(accounts, s, 'coppia', 62500)).toBe(112500)
    expect(savingsTotal(accounts, s, 'coppia', 62500)).toBe(362500)
  })

  it('uscite ed entrate cambiano il saldo del conto', () => {
    const s = computeShares(accounts, [
      tx({ type: 'uscita', cents: 4280, accountId: 'coppia' }),
      tx({ type: 'entrata', cents: 125000, accountId: 'corrente' }),
    ])
    expect(s.get('coppia')!.jack).toBe(15720)
    expect(s.get('corrente')!.jack).toBe(225000)
  })

  it('in un conto di un solo titolare la quota è sempre sua, chiunque inserisca', () => {
    const s = computeShares(accounts, [tx({ type: 'uscita', cents: 1000, accountId: 'coppia', who: 'fiore' })])
    expect(s.get('coppia')).toEqual({ jack: 19000, fiore: 0 })
  })

  it('nei contanti la spesa scala la quota di chi ha speso', () => {
    const s = computeShares(accounts, [tx({ type: 'uscita', cents: 500, accountId: 'contanti', who: 'fiore' })])
    expect(s.get('contanti')).toEqual({ jack: 3000, fiore: 1500 })
  })

  it('un giroconto non cambia il totale, solo i conti', () => {
    const before = computeShares(accounts, [])
    const s = computeShares(accounts, [tx({ type: 'giroconto', cents: 10000, accountId: 'corrente', toAccountId: 'coppia' })])
    expect(s.get('corrente')!.jack).toBe(90000)
    expect(s.get('coppia')!.jack).toBe(30000)
    expect(availableBalance(accounts, s, 'coppia')).toBe(availableBalance(accounts, before, 'coppia'))
  })

  it('il 30% per le tasse esce dal disponibile e va nella quota di chi ha incassato', () => {
    const s = computeShares(accounts, [
      tx({ type: 'entrata', cents: 100000, accountId: 'fiore', who: 'fiore' }),
      tx({ type: 'giroconto', cents: 30000, accountId: 'fiore', toAccountId: 'tasse', who: 'fiore' }),
    ])
    expect(s.get('fiore')!.fiore).toBe(120000)
    expect(s.get('tasse')).toEqual({ jack: 0, fiore: 30000 })
    expect(taxTotal(accounts, s, 'jack')).toBe(0)
    expect(availableBalance(accounts, s, 'fiore')).toBe(122000)
  })

  it('un giroconto può passare contanti dalla quota di uno a quella dell’altro', () => {
    const t = tx({ type: 'giroconto', cents: 1000, accountId: 'contanti', toAccountId: 'contanti', who: 'jack', toWho: 'fiore' })
    expect(computeShares(accounts, [t]).get('contanti')).toEqual({ jack: 2000, fiore: 3000 })
    expect(effectOn('contanti', t)).toEqual([{ cents: -1000, side: 'from' }, { cents: 1000, side: 'to' }])
  })
})

describe('riepilogo del mese', () => {
  const txs = [
    tx({ type: 'uscita', cents: 4280, accountId: 'coppia', category: 'supermercato' }),
    tx({ type: 'uscita', cents: 3160, accountId: 'coppia', category: 'supermercato' }),
    tx({ type: 'uscita', cents: 1900, accountId: 'fiore', category: 'divertimento', who: 'fiore' }),
    tx({ type: 'entrata', cents: 125000, accountId: 'corrente', category: 'lavoro' }),
    tx({ type: 'giroconto', cents: 37500, accountId: 'corrente', toAccountId: 'tasse' }),
    tx({ type: 'uscita', cents: 9999, accountId: 'coppia', category: 'viaggi', date: '2026-09-30' }),
  ]

  it('somma per categoria, in ordine decrescente, senza giroconti né altri mesi', () => {
    const m = monthSummary(txs, '2026-10', byId, 'coppia')
    expect(m.spent).toBe(9340)
    expect(m.income).toBe(125000)
    expect(m.byCategory).toEqual([['supermercato', 7440], ['divertimento', 1900]])
  })

  it('filtra per persona', () => {
    expect(monthSummary(txs, '2026-10', byId, 'fiore')).toEqual({ income: 0, spent: 1900, byCategory: [['divertimento', 1900]] })
    expect(monthSummary(txs, '2026-10', byId, 'jack').spent).toBe(7440)
  })

  it('un giroconto verso un conto di entrambi è visibile a chi riceve la quota', () => {
    const t = tx({ type: 'giroconto', cents: 100, accountId: 'fiore', toAccountId: 'tasse', who: 'fiore' })
    expect(inView(t, byId, 'fiore')).toBe(true)
    expect(inView(t, byId, 'jack')).toBe(false)
  })
})
