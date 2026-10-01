import { describe, expect, it } from 'vitest'
import { dueDate, dueDates, lastDayOfMonth, nextDue, nextMonth, occurrenceId, occurrenceKey, parseRecurrences } from './recurrences'

describe('scadenze', () => {
  it('conosce l’ultimo giorno di ogni mese, anche negli anni bisestili', () => {
    expect(lastDayOfMonth('2026-02')).toBe(28)
    expect(lastDayOfMonth('2028-02')).toBe(29)
    expect(lastDayOfMonth('2026-04')).toBe(30)
    expect(lastDayOfMonth('2026-12')).toBe(31)
  })

  it('se il giorno non esiste usa l’ultimo del mese', () => {
    expect(dueDate('2027-02', 29)).toBe('2027-02-28')
    expect(dueDate('2028-02', 29)).toBe('2028-02-29')
    expect(dueDate('2026-11', 31)).toBe('2026-11-30')
    expect(dueDate('2026-10', 1)).toBe('2026-10-01')
  })

  it('passa al mese dopo, anche a fine anno', () => {
    expect(nextMonth('2026-10')).toBe('2026-11')
    expect(nextMonth('2026-12')).toBe('2027-01')
  })
})

describe('movimenti da creare', () => {
  it('niente prima della scadenza', () => {
    expect(dueDates({ day: 15, start: '2026-10-02' }, '2026-10-14')).toEqual([])
  })

  it('crea il movimento dal giorno di scadenza in poi', () => {
    expect(dueDates({ day: 15, start: '2026-10-02' }, '2026-10-15')).toEqual(['2026-10-15'])
    expect(dueDates({ day: 15, start: '2026-10-02' }, '2026-10-20')).toEqual(['2026-10-15'])
  })

  it('salta le scadenze precedenti alla data di partenza', () => {
    expect(dueDates({ day: 1, start: '2026-10-02' }, '2026-10-31')).toEqual([])
    expect(dueDates({ day: 1, start: '2026-10-02' }, '2026-11-01')).toEqual(['2026-11-01'])
  })

  it('recupera tutti i mesi se l’app non viene aperta a lungo', () => {
    expect(dueDates({ day: 29, start: '2026-10-02' }, '2027-03-05')).toEqual([
      '2026-10-29', '2026-11-29', '2026-12-29', '2027-01-29', '2027-02-28',
    ])
  })

  it('trova la prossima scadenza', () => {
    expect(nextDue({ day: 20, start: '2026-10-02' }, '2026-10-18')).toBe('2026-10-20')
    expect(nextDue({ day: 20, start: '2026-10-02' }, '2026-10-20')).toBe('2026-11-20')
    expect(nextDue({ day: 1, start: '2026-10-02' }, '2026-10-01')).toBe('2026-11-01')
    expect(nextDue({ day: 31, start: '2026-10-02' }, '2026-12-31')).toBe('2027-01-31')
  })
})

describe('registrazione unica', () => {
  it('la chiave dipende da spesa e mese, non dal giorno', () => {
    expect(occurrenceKey('abc', '2027-02-28')).toBe('abc:2027-02-01')
  })

  it('l’id del movimento è lo stesso su ogni telefono ed è un UUID valido', async () => {
    const a = await occurrenceId('rec-1', '2026-10-15')
    expect(a).toBe(await occurrenceId('rec-1', '2026-10-15'))
    expect(a).not.toBe(await occurrenceId('rec-1', '2026-11-15'))
    expect(a).not.toBe(await occurrenceId('rec-2', '2026-10-15'))
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('importazione', () => {
  it('legge spese e dettagli', () => {
    const { items, errors } = parseRecurrences(`
      1; Affitto; 600,00; Casa e bollette
      1; Abbonamenti; 0; Abbonamenti
      -; Film; 8,99
      -; Musica; 10,99
      15; Rata macchina; 1.250; macchina
    `)
    expect(errors).toEqual([])
    expect(items).toEqual([
      { name: 'Affitto', cents: 60000, day: 1, category: 'casa' },
      { name: 'Abbonamenti', cents: 1998, day: 1, category: 'abbonamenti', subs: [{ name: 'Film', cents: 899 }, { name: 'Musica', cents: 1099 }] },
      { name: 'Rata macchina', cents: 125000, day: 15, category: 'macchina' },
    ])
  })

  it('segnala le righe sbagliate senza fermarsi', () => {
    const { items, errors } = parseRecurrences('40; Affitto; 600; Casa e bollette\n1; Palestra; abc; Salute\n1; Palestra; 45; Sport\n1; Palestra; 45; Salute')
    expect(items).toHaveLength(1)
    expect(errors).toEqual([
      'Riga 1: "40" non è un giorno da 1 a 31',
      'Riga 2: "abc" non è un importo',
      'Riga 3: categoria "Sport" sconosciuta',
    ])
    expect(parseRecurrences('1; Vuota; 0; Altro').errors).toEqual(['Vuota: importo a zero e nessun dettaglio'])
  })
})
