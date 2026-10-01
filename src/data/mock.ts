// Dati di esempio per le schermate non ancora collegate ai dati veri
// (Statistiche, Spese fisse): nomi e importi inventati, in centesimi.
import type { CategoryKey } from './categories'

export const TODAY_DAY = 18

export const SUMMARY = {
  available: 234820,
  inPiggyBanks: 62500,
  deposit: 300000,
  budgetTotal: 210000,
  income: 248000,
}

export const MONTHS: [string, number][] = [
  ['Mag', 154000],
  ['Giu', 172000],
  ['Lug', 191000],
  ['Ago', 224000],
  ['Set', 168000],
  ['Ott', 152267],
]

export const BUDGETS: { cat: CategoryKey; spent: number; limit: number }[] = [
  { cat: 'cibo', spent: 14250, limit: 13000 },
  { cat: 'macchina', spent: 31000, limit: 40000 },
  { cat: 'divertimento', spent: 5800, limit: 10000 },
  { cat: 'supermercato', spent: 18640, limit: 35000 },
  { cat: 'trasporti', spent: 3578, limit: 6000 },
]

export const FIXED: { day: number; rows: { cat: CategoryKey; name: string; cents: number; subs?: boolean }[] }[] = [
  {
    day: 1,
    rows: [
      { cat: 'casa', name: 'Affitto', cents: 60000 },
      { cat: 'casa', name: 'Telefono mobile', cents: 999 },
      { cat: 'abbonamenti', name: 'Abbonamenti', cents: 4500, subs: true },
      { cat: 'shopping', name: 'Rata telefono', cents: 9000 },
      { cat: 'salute', name: 'Palestra', cents: 4500 },
    ],
  },
  { day: 15, rows: [{ cat: 'macchina', name: 'Rata macchina', cents: 25000 }] },
  { day: 20, rows: [{ cat: 'shopping', name: 'Rata fotocamera', cents: 12000 }] },
  { day: 29, rows: [{ cat: 'casa', name: 'Wi-fi di casa', cents: 2990 }] },
]

export const SUBSCRIPTIONS: [string, number][] = [
  ['Streaming film', 899],
  ['Streaming musica', 1099],
  ['Spazio cloud', 299],
  ['App foto', 1203],
  ['Giochi', 1000],
]
