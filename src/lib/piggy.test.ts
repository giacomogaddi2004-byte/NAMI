import { describe, expect, it } from 'vitest'
import type { PiggyMove } from '../data/model'
import { pace, piggyAmount, piggyShares } from './piggy'

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
