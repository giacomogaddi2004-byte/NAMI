// Spese fisse: quando scadono e quali movimenti vanno creati.
import { CAT, EXPENSE_CATEGORIES, type CategoryKey } from '../data/categories'
import type { Recurrence } from '../data/model'
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

/** Scadenze già passate (da `start` a `today` compresi) per le quali deve esistere un movimento. */
export function dueDates(rec: Pick<Recurrence, 'day' | 'start'>, today: string): string[] {
  const out: string[] = []
  for (let month = rec.start.slice(0, 7); month <= today.slice(0, 7); month = nextMonth(month)) {
    const due = dueDate(month, rec.day)
    if (due >= rec.start && due <= today) out.push(due)
  }
  return out
}

/** Prossima scadenza dopo oggi. */
export function nextDue(rec: Pick<Recurrence, 'day' | 'start'>, today: string): string {
  const from = rec.start > today ? rec.start : today
  let month = from.slice(0, 7)
  let due = dueDate(month, rec.day)
  while (due < rec.start || due <= today) {
    month = nextMonth(month)
    due = dueDate(month, rec.day)
  }
  return due
}

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

export type ImportedRecurrence = Pick<Recurrence, 'name' | 'cents' | 'day' | 'category' | 'subs'>

const CATEGORY_BY_NAME = new Map(EXPENSE_CATEGORIES.map((k) => [CAT[k].name.toLowerCase(), k]))

/**
 * Legge un elenco di spese fisse, una per riga: `giorno; nome; importo; categoria`.
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
    items.push({ name: parts[1], cents, day, category })
  })
  // Con i dettagli, l'importo della voce è la loro somma.
  for (const item of items) {
    if (item.subs) item.cents = item.subs.reduce((sum, s) => sum + s.cents, 0)
    if (item.cents === 0) errors.push(`${item.name}: importo a zero e nessun dettaglio`)
  }
  return { items, errors }
}
