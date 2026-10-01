// Dati di esempio per le schermate non ancora collegate ai dati veri
// (Statistiche): nomi e importi inventati, in centesimi.
import type { CategoryKey } from './categories'

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
