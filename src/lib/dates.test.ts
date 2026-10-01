import { describe, expect, it } from 'vitest'
import { addDays, dayTitle, longDay, monthName, shortDay, today } from './dates'

describe('date nel fuso di Roma', () => {
  it('poco dopo mezzanotte a Roma è già il giorno nuovo, anche se a Londra no', () => {
    expect(today(new Date('2026-10-17T22:30:00Z'))).toBe('2026-10-18')
    expect(today(new Date('2026-01-17T22:30:00Z'))).toBe('2026-01-17')
  })

  it('sposta i giorni attraverso mesi e anni', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('scrive i giorni in italiano', () => {
    expect(longDay('2026-10-18')).toBe('Domenica 18 ottobre')
    expect(dayTitle('2026-10-18', '2026-10-18')).toBe('Oggi · domenica 18 ottobre')
    expect(dayTitle('2026-10-17', '2026-10-18')).toBe('Ieri · sabato 17 ottobre')
    expect(dayTitle('2026-10-16', '2026-10-18')).toBe('Venerdì 16 ottobre')
    expect(shortDay('2026-10-18', '2026-10-18')).toBe('Oggi')
    expect(shortDay('2026-10-16', '2026-10-18')).toBe('16 ott')
    expect(monthName('2026-10-18')).toBe('ottobre')
  })
})
