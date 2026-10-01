import { describe, expect, it } from 'vitest'
import type { Account, PiggyMove, Tx } from '../data/model'
import { budgetTotal, crossed, level, monthEnd, monthsBack, prevMonth, savingsAt, spentByCategory, suggestLimits } from './budget'

describe('soglie del budget', () => {
  it('ok sotto l’80%, vicino tra 80% e 100%, superato da 100% in su', () => {
    expect(level(7900, 10000)).toBe('ok')
    expect(level(8000, 10000)).toBe('near')
    expect(level(9999, 10000)).toBe('near')
    expect(level(10000, 10000)).toBe('over')
    expect(level(500, 0)).toBe('ok')
  })

  it('avvisa una volta sola per soglia', () => {
    expect(crossed(7000, 8500, 10000)).toBe('near')
    expect(crossed(8500, 9000, 10000)).toBeNull()
    expect(crossed(9000, 11000, 10000)).toBe('over')
    expect(crossed(11000, 12000, 10000)).toBeNull()
    expect(crossed(5000, 12000, 10000)).toBe('over')
    expect(crossed(1000, 2000, 10000)).toBeNull()
    expect(crossed(0, 5000, 0)).toBeNull()
  })
})

describe('mesi', () => {
  it('torna indietro attraversando l’anno', () => {
    expect(prevMonth('2026-10')).toBe('2026-09')
    expect(prevMonth('2027-01')).toBe('2026-12')
    expect(monthsBack('2027-02', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
    expect(monthEnd('2028-02')).toBe('2028-02-29')
  })
})

const acc = (id: string, kind: Account['kind'], owner: Account['owner'], jack = 0, fiore = 0): Account => ({
  id, name: id, kind, owner, opening: { jack, fiore }, order: 0,
})
const accounts = [acc('cc', 'corrente', 'jack', 100000), acc('dep', 'deposito', 'entrambi', 50000, 0)]
const byId = new Map(accounts.map((a) => [a.id, a]))

let n = 0
const tx = (t: Partial<Tx> & Pick<Tx, 'type' | 'cents' | 'date'>): Tx => ({ id: `t${++n}`, accountId: 'cc', merchant: 'x', who: 'jack', ...t })

describe('limiti proposti', () => {
  const txs = [
    tx({ type: 'uscita', cents: 30000, date: '2026-07-05', category: 'supermercato' }),
    tx({ type: 'uscita', cents: 36000, date: '2026-08-10', category: 'supermercato' }),
    tx({ type: 'uscita', cents: 9001, date: '2026-09-10', category: 'cibo' }),
    tx({ type: 'uscita', cents: 50000, date: '2026-10-02', category: 'supermercato' }),
    tx({ type: 'entrata', cents: 200000, date: '2026-09-15', category: 'lavoro' }),
  ]

  it('usa i mesi chiusi, mai quello in corso, e arrotonda per eccesso a 10 €', () => {
    expect(suggestLimits(txs, byId, '2026-10-18')).toEqual({ supermercato: 22000, cibo: 4000 })
  })

  it('guarda al massimo gli ultimi 3 mesi', () => {
    const more = [tx({ type: 'uscita', cents: 90000, date: '2026-05-05', category: 'supermercato' }), ...txs]
    expect(suggestLimits(more, byId, '2026-10-18').supermercato).toBe(22000)
  })

  it('non propone nulla finché non c’è un mese chiuso', () => {
    expect(suggestLimits([], byId, '2026-10-18')).toEqual({})
    expect(suggestLimits([txs[3]], byId, '2026-10-18')).toEqual({})
  })

  it('somma per categoria nel mese scelto', () => {
    expect(spentByCategory(txs, '2026-10', byId).get('supermercato')).toBe(50000)
    expect(spentByCategory(txs, '2026-09', byId).get('cibo')).toBe(9001)
  })
})

describe('risparmi nel tempo', () => {
  const piggy: PiggyMove = { id: 'm1', piggyId: 'p', type: 'versamento', cents: 20000, date: '2026-09-20', accountId: 'cc', who: 'jack' }
  const txs = [tx({ type: 'giroconto', cents: 10000, date: '2026-08-15', accountId: 'cc', toAccountId: 'dep' })]

  it('conta il conto deposito e i salvadanai a fine giornata', () => {
    expect(savingsAt(accounts, txs, [piggy], '2026-07-31', 'coppia')).toBe(50000)
    expect(savingsAt(accounts, txs, [piggy], '2026-08-31', 'coppia')).toBe(60000)
    expect(savingsAt(accounts, txs, [piggy], '2026-09-30', 'coppia')).toBe(80000)
  })

  it('si può guardare una persona sola', () => {
    expect(savingsAt(accounts, txs, [piggy], '2026-09-30', 'fiore')).toBe(0)
    expect(savingsAt(accounts, txs, [piggy], '2026-07-31', 'jack')).toBe(50000)
  })
})

describe('totale dei budget', () => {
  it('somma i limiti', () => {
    expect(budgetTotal([{ id: 'a', category: 'cibo', limit: 13000 }, { id: 'b', category: 'casa', limit: 50000 }])).toBe(63000)
    expect(budgetTotal([])).toBe(0)
  })
})
