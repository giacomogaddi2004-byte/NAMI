// Salvadanai virtuali: i soldi restano sul conto ma escono dal saldo disponibile.
import { PERSON_KEYS, type PersonKey, type PiggyMove, type View } from '../data/model'
import { nextMonth } from './recurrences'

/** Versamento = soldi che entrano nel salvadanaio, prelievo = che escono. */
export const moveEffect = (m: PiggyMove) => (m.type === 'versamento' ? m.cents : -m.cents)

/** Quanto ha messo ciascuno in un salvadanaio (o in tutti, se non si indica quale). */
export function piggyShares(moves: PiggyMove[], piggyId?: string): Record<PersonKey, number> {
  const out = Object.fromEntries(PERSON_KEYS.map((who) => [who, 0])) as Record<PersonKey, number>
  for (const m of moves) if (!piggyId || m.piggyId === piggyId) out[m.who] += moveEffect(m)
  return out
}

/** Soldi nei salvadanai per la vista scelta: quelli della persona, oppure di tutta la coppia. */
export function piggyAmount(moves: PiggyMove[], view: View): number {
  const shares = piggyShares(moves)
  return view === 'coppia' ? shares.jack + shares.fiore : shares[view]
}

export type Pace =
  | { kind: 'none' }
  | { kind: 'late' }
  | { kind: 'ok'; perMonth: number; months: string[] }

/** Mesi ("AAAA-MM") che restano per versare: dal prossimo fino a quello della scadenza compreso. */
function monthsLeft(today: string, deadline: string): string[] {
  const out: string[] = []
  for (let m = nextMonth(today.slice(0, 7)); m <= deadline.slice(0, 7); m = nextMonth(m)) out.push(m)
  return out
}

/** Quanto serve al mese per arrivare in tempo, arrotondato per eccesso all'euro. */
export function pace(missing: number, today: string, deadline: string | undefined): Pace {
  if (!deadline || missing <= 0) return { kind: 'none' }
  if (deadline < today) return { kind: 'late' }
  // Scadenza nel mese in corso: va versato tutto entro questo mese.
  const months = monthsLeft(today, deadline)
  const list = months.length > 0 ? months : [today.slice(0, 7)]
  return { kind: 'ok', perMonth: Math.ceil(missing / list.length / 100) * 100, months: list }
}
