import { describe, expect, it } from 'vitest'
import type { Account, PiggyMove } from '../data/model'
import { pace, piggyAmount, piggyShares, settlements } from './piggy'

let n = 0
const move = (m: Partial<PiggyMove> & Pick<PiggyMove, 'type' | 'cents' | 'who'>): PiggyMove => ({
  id: `m${++n}`, piggyId: 'p1', date: '2026-10-12', accountId: 'a', ...m,
})

const moves = [
  move({ type: 'versamento', cents: 50000, who: 'jack' }),
  move({ type: 'versamento', cents: 30000, who: 'fiore' }),
  move({ type: 'prelievo', cents: 10000, who: 'jack' }),
  move({ type: 'versamento', cents: 5000, who: 'jack', piggyId: 'p2' }),
]

describe('soldi nei salvadanai', () => {
  it('somma versamenti e sottrae prelievi, per persona', () => {
    expect(piggyShares(moves)).toEqual({ jack: 45000, fiore: 30000 })
    expect(piggyShares(moves, 'p1')).toEqual({ jack: 40000, fiore: 30000 })
    expect(piggyShares(moves, 'p2')).toEqual({ jack: 5000, fiore: 0 })
  })

  it('cambia con la vista scelta', () => {
    expect(piggyAmount(moves, 'coppia')).toBe(75000)
    expect(piggyAmount(moves, 'jack')).toBe(45000)
    expect(piggyAmount(moves, 'fiore')).toBe(30000)
    expect(piggyAmount([], 'coppia')).toBe(0)
  })
})

describe('pareggio quando si ottiene l’obiettivo', () => {
  const acc = (id: string, owner: Account['owner'], kind: Account['kind'] = 'corrente'): Account => ({
    id, name: id, kind, owner, opening: { jack: 0, fiore: 0 }, order: 0,
  })
  const accounts = [acc('jack-cc', 'jack'), acc('jack-coppia', 'jack'), acc('fiore-cc', 'fiore'), acc('contanti', 'entrambi', 'contanti')]
  const shares = { jack: 150000, fiore: 100000 }

  it('chi non paga gira la sua quota al conto da cui si paga', () => {
    expect(settlements(accounts, shares, 'jack', 'jack-cc')).toEqual([{ who: 'fiore', cents: 100000, fromAccountId: 'fiore-cc' }])
    expect(settlements(accounts, shares, 'fiore', 'fiore-cc')).toEqual([{ who: 'jack', cents: 150000, fromAccountId: 'jack-cc' }])
  })

  it('vale anche pagando da un altro conto di chi paga o dai contanti', () => {
    expect(settlements(accounts, shares, 'jack', 'jack-coppia')).toHaveLength(1)
    expect(settlements(accounts, shares, 'jack', 'contanti')).toHaveLength(1)
  })

  it('niente giroconto se chi non paga non ha messo nulla, o se paga già dal suo conto', () => {
    expect(settlements(accounts, { jack: 100000, fiore: 0 }, 'jack', 'jack-cc')).toEqual([])
    // Se l'acquisto esce già dal conto di chi dovrebbe girare, non c'è nulla da spostare.
    expect(settlements(accounts, shares, 'jack', 'fiore-cc')).toEqual([])
    expect(settlements(accounts.filter((a) => a.id !== 'fiore-cc'), shares, 'jack', 'jack-cc')).toEqual([])
  })
})

describe('quanto serve al mese', () => {
  it('divide per i mesi che restano, dal prossimo alla scadenza', () => {
    expect(pace(187500, '2026-10-18', '2027-01-31')).toEqual({
      kind: 'ok', perMonth: 62500, months: ['2026-11', '2026-12', '2027-01'],
    })
  })

  it('arrotonda per eccesso all’euro', () => {
    expect(pace(100001, '2026-10-18', '2027-01-31')).toMatchObject({ kind: 'ok', perMonth: 33400 })
  })

  it('con scadenza nel mese in corso serve tutto subito', () => {
    expect(pace(20000, '2026-10-18', '2026-10-31')).toEqual({ kind: 'ok', perMonth: 20000, months: ['2026-10'] })
  })

  it('segnala la scadenza passata e il caso senza scadenza o già raggiunto', () => {
    expect(pace(20000, '2026-10-18', '2026-10-10')).toEqual({ kind: 'late' })
    expect(pace(20000, '2026-10-18', undefined)).toEqual({ kind: 'none' })
    expect(pace(0, '2026-10-18', '2027-01-31')).toEqual({ kind: 'none' })
    expect(pace(-500, '2026-10-18', '2027-01-31')).toEqual({ kind: 'none' })
  })

  it('attraversa il cambio d’anno', () => {
    expect(pace(30000, '2026-12-05', '2027-02-28')).toMatchObject({ months: ['2027-01', '2027-02'], perMonth: 15000 })
  })
})
