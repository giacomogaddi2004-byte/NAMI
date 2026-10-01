import { describe, expect, it } from 'vitest'
import { hashToken, newShortcutToken, parseShortcutAmount } from './arrivals'

describe('parseShortcutAmount', () => {
  it('legge i formati italiani e inglesi', () => {
    expect(parseShortcutAmount('12,90 €')).toBe(1290)
    expect(parseShortcutAmount('€12.90')).toBe(1290)
    expect(parseShortcutAmount('EUR 12.90')).toBe(1290)
    expect(parseShortcutAmount('12.9')).toBe(1290)
    expect(parseShortcutAmount('0,99')).toBe(99)
    expect(parseShortcutAmount('3')).toBe(300)
  })

  it('riconosce le migliaia', () => {
    expect(parseShortcutAmount('1.234,56 €')).toBe(123456)
    expect(parseShortcutAmount('1,234.56')).toBe(123456)
    expect(parseShortcutAmount('1.234')).toBe(123400)
    expect(parseShortcutAmount('12.345.678,90')).toBe(1234567890)
  })

  it('ignora il segno: un rimborso resta da controllare a mano', () => {
    expect(parseShortcutAmount('-12,90 €')).toBe(1290)
    expect(parseShortcutAmount('−12,90 €')).toBe(1290)
  })

  it('rifiuta testi che non sono importi', () => {
    expect(parseShortcutAmount('')).toBeNull()
    expect(parseShortcutAmount('abc')).toBeNull()
    expect(parseShortcutAmount('0,00')).toBeNull()
    expect(parseShortcutAmount('1,234.567')).toBeNull()
  })

  it('un solo separatore con tre cifre dopo vale come migliaia', () => {
    expect(parseShortcutAmount('12,905')).toBe(1290500)
    expect(parseShortcutAmount('1.234.567')).toBe(123456700)
  })
})

describe('codice personale', () => {
  it('è lungo e diverso ogni volta', () => {
    const a = newShortcutToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(newShortcutToken()).not.toBe(a)
  })

  it('l’impronta è SHA-256 in esadecimale, uguale a quella calcolata dal database', async () => {
    expect(await hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
