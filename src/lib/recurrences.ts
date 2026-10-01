// Spese fisse: quando scadono e quali movimenti vanno creati.
import { CAT, EXPENSE_CATEGORIES, type CategoryKey } from '../data/categories'
import type { Recurrence } from '../data/model'
import { addDays } from './dates'
import { parseEur } from './money'

/** Ultimo giorno di un mese "AAAA-MM". */
export function lastDayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Scadenza in un certo mese: se il giorno non esiste (es. 31 a febbraio) vale l'ultimo del mese. */
export function dueDate(month: string, day: number): string {
  return `${month}-${String(Math.min(day, lastDayOfMonth(month))).padStart(2, '0')}`
}

export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

type Timing = Pick<Recurrence, 'day' | 'start' | 'end'>

/** Scadenze tra due date (comprese), dentro il periodo in cui la spesa è attiva. */
export function scheduleBetween(rec: Timing, from: string, to: string): string[] {
  const out: string[] = []
  for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = nextMonth(month)) {
    const due = dueDate(month, rec.day)
    if (due >= from && due <= to && due >= rec.start && (!rec.end || due <= rec.end)) out.push(due)
  }
  return out
}

/** Scadenze già passate (da `start` a `today` compresi) per le quali deve esistere un movimento. */
export function dueDates(rec: Timing, today: string): string[] {
  return scheduleBetween(rec, rec.start, today)
}

/** Primo giorno da cui contare le scadenze future: l'inizio, se non è ancora arrivato, altrimenti domani. */
const firstFuture = (rec: Pick<Recurrence, 'start'>, today: string) => (rec.start > today ? rec.start : addDays(today, 1))

/** Prossima scadenza dopo oggi, o null se la spesa è finita. */
export function nextDue(rec: Timing, today: string): string | null {
  const from = firstFuture(rec, today)
  for (let month = from.slice(0, 7); ; month = nextMonth(month)) {
    const due = dueDate(month, rec.day)
    if (rec.end && due > rec.end) return null
    if (due >= from) return due
  }
}

/** Quante scadenze restano dopo oggi (null se la spesa non ha una fine). */
export function dueLeft(rec: Timing, today: string): number | null {
  return rec.end ? scheduleBetween(rec, firstFuture(rec, today), rec.end).length : null
}

/** Data dell'ultima scadenza di una spesa con fine (null se non ne ha o non ne ha mai). */
export function lastDue(rec: Timing): string | null {
  if (!rec.end) return null
  return scheduleBetween(rec, rec.start, rec.end).pop() ?? null
}

/** Data della `times`-esima scadenza, contando da `from` (compreso): è la fine di una spesa da ripetere `times` volte. */
export function endAfter(day: number, from: string, times: number): string {
  let left = times
  for (let month = from.slice(0, 7); ; month = nextMonth(month)) {
    const due = dueDate(month, day)
    if (due >= from && --left === 0) return due
  }
}

/** Da quando contare le ripetizioni di una spesa nuova o già in corso. */
export const countFrom = (rec: Pick<Recurrence, 'start'>, today: string) => firstFuture(rec, today)

/** Chiave di una registrazione: una sola per spesa fissa e mese. */
export const occurrenceKey = (recurrenceId: string, due: string) => `${recurrenceId}:${due.slice(0, 7)}-01`

/**
 * Id del movimento generato, uguale su tutti i telefoni: se due persone aprono
 * l'app lo stesso giorno creano lo stesso movimento, non due.
 */
export async function occurrenceId(recurrenceId: string, due: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(occurrenceKey(recurrenceId, due))))
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = [...hash.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export type ImportedRecurrence = Pick<Recurrence, 'name' | 'cents' | 'day' | 'category' | 'subs'> & {
  /** Quante volte ripeterla (una rata); vuoto = per sempre. */
  times?: number
}

const CATEGORY_BY_NAME = new Map(EXPENSE_CATEGORIES.map((k) => [CAT[k].name.toLowerCase(), k]))

/**
 * Legge un elenco di spese fisse, una per riga: `giorno; nome; importo; categoria; volte`
 * (le volte sono facoltative: servono per le rate).
 * Una riga che inizia con `-` è un dettaglio della spesa precedente: `-; nome; importo`.
 */
export function parseRecurrences(text: string): { items: ImportedRecurrence[]; errors: string[] } {
  const items: ImportedRecurrence[] = []
  const errors: string[] = []
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const parts = line.split(';').map((p) => p.trim())
    const fail = (why: string) => errors.push(`Riga ${i + 1}: ${why}`)
    const cents = parseEur(parts[2] ?? '')
    if (!parts[1]) return fail('manca il nome')
    if (cents === null) return fail(`"${parts[2] ?? ''}" non è un importo`)
    if (parts[0] === '-') {
      if (cents === 0) return fail('un dettaglio deve avere un importo maggiore di zero')
      const parent = items[items.length - 1]
      if (!parent) return fail('un dettaglio deve seguire una spesa')
      parent.subs = [...(parent.subs ?? []), { name: parts[1], cents }]
      return
    }
    const day = Number(parts[0])
    if (!Number.isInteger(day) || day < 1 || day > 31) return fail(`"${parts[0]}" non è un giorno da 1 a 31`)
    const category: CategoryKey | undefined = CATEGORY_BY_NAME.get((parts[3] ?? '').toLowerCase())
    if (!category) return fail(`categoria "${parts[3] ?? ''}" sconosciuta`)
    const times = parts[4] ? Number(parts[4]) : undefined
    if (times !== undefined && (!Number.isInteger(times) || times < 1 || times > 600)) return fail(`"${parts[4]}" non è un numero di volte valido`)
    items.push({ name: parts[1], cents, day, category, ...(times ? { times } : {}) })
  })
  // Con i dettagli, l'importo della voce è la loro somma.
  for (const item of items) {
    if (item.subs) item.cents = item.subs.reduce((sum, s) => sum + s.cents, 0)
    if (item.cents === 0) errors.push(`${item.name}: importo a zero e nessun dettaglio`)
  }
  return { items, errors }
}
