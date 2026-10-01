// Le date dei movimenti sono giorni "AAAA-MM-GG" nel fuso Europe/Rome.

const ROME = 'Europe/Rome'
const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: ROME, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Il giorno di oggi a Roma. */
export function today(now: Date = new Date()): string {
  return isoDay.format(now)
}

/** Sposta un giorno di `days` giorni (anche negativi). */
export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function format(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'UTC', ...options }).format(new Date(`${day}T12:00:00Z`))
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Domenica 18 ottobre" */
export function longDay(day: string): string {
  return capitalize(format(day, { weekday: 'long', day: 'numeric', month: 'long' }))
}

/** "Oggi · domenica 18 ottobre", "Ieri · sabato 17 ottobre", "Venerdì 16 ottobre" */
export function dayTitle(day: string, now: string = today()): string {
  const long = format(day, { weekday: 'long', day: 'numeric', month: 'long' })
  if (day === now) return `Oggi · ${long}`
  if (day === addDays(now, -1)) return `Ieri · ${long}`
  return capitalize(long)
}

/** "Oggi", "Ieri", "16 ott" */
export function shortDay(day: string, now: string = today()): string {
  if (day === now) return 'Oggi'
  if (day === addDays(now, -1)) return 'Ieri'
  return format(day, { day: 'numeric', month: 'short' })
}

/** "ottobre" */
export function monthName(day: string): string {
  return format(day, { month: 'long' })
}
