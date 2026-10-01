import { describe, expect, it } from 'vitest'
import { formatEur, formatEurRounded, formatSigned } from './money'

describe('formatEur', () => {
  it('usa il punto per le migliaia e la virgola per i decimali', () => {
    expect(formatEur(123456)).toBe('1.234,56 €')
    expect(formatEur(100000)).toBe('1.000,00 €')
    expect(formatEur(123456789)).toBe('1.234.567,89 €')
  })

  it('gestisce importi piccoli e zero', () => {
    expect(formatEur(0)).toBe('0,00 €')
    expect(formatEur(5)).toBe('0,05 €')
    expect(formatEur(799)).toBe('7,99 €')
  })

  it('non mostra il segno', () => {
    expect(formatEur(-4280)).toBe('42,80 €')
  })
})

describe('formatSigned', () => {
  it('usa il segno meno tipografico per le uscite', () => {
    expect(formatSigned(-4280)).toBe('−42,80 €')
  })

  it('usa il più per le entrate', () => {
    expect(formatSigned(125000)).toBe('+1.250,00 €')
  })
})

describe('formatEurRounded', () => {
  it('arrotonda agli euro interi', () => {
    expect(formatEurRounded(160430)).toBe('1.604 €')
    expect(formatEurRounded(62500)).toBe('625 €')
  })
})
