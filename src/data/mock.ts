// Dati finti della Fase 1: nomi e importi inventati, in centesimi.
import type { CategoryKey } from './categories'

export interface MockTx {
  cat: CategoryKey
  name: string
  account: string
  cents: number
  tag?: 'Apple Pay' | 'Fissa'
}

export interface MockDay {
  /** Etichetta breve per la home ("Oggi", "Ieri"). */
  short: string
  title: string
  rows: MockTx[]
}

export const TODAY_LABEL = 'Domenica 18 ottobre'
export const TODAY_DAY = 18

export const DAYS: MockDay[] = [
  {
    short: 'Oggi',
    title: 'Oggi · domenica 18 ottobre',
    rows: [
      { cat: 'supermercato', name: 'Esselunga', account: 'Conto di coppia', cents: -4280, tag: 'Apple Pay' },
      { cat: 'cibo', name: 'Bar Centrale', account: 'Contanti', cents: -320 },
    ],
  },
  {
    short: 'Ieri',
    title: 'Ieri · sabato 17 ottobre',
    rows: [
      { cat: 'macchina', name: 'Eni', account: 'Conto corrente', cents: -6000, tag: 'Apple Pay' },
      { cat: 'divertimento', name: 'Cinema Odeon', account: 'Conto del partner', cents: -1900 },
      { cat: 'cibo', name: 'Glovo', account: 'Conto di coppia', cents: -2450, tag: 'Apple Pay' },
    ],
  },
  {
    short: '16 ott',
    title: 'Venerdì 16 ottobre',
    rows: [
      { cat: 'lavoro', name: 'Pagamento cliente', account: 'Conto corrente', cents: 125000 },
      { cat: 'supermercato', name: 'Lidl', account: 'Conto di coppia', cents: -3160, tag: 'Apple Pay' },
    ],
  },
  {
    short: '15 ott',
    title: 'Giovedì 15 ottobre',
    rows: [
      { cat: 'macchina', name: 'Rata macchina', account: 'Conto corrente', cents: -25000, tag: 'Fissa' },
      { cat: 'trasporti', name: 'Trenitalia', account: 'Conto corrente', cents: -3578, tag: 'Apple Pay' },
    ],
  },
]

export const SPEND_BY_CATEGORY: [CategoryKey, number][] = [
  ['casa', 60999],
  ['macchina', 31000],
  ['supermercato', 18640],
  ['cibo', 14250],
  ['shopping', 9000],
  ['divertimento', 5800],
  ['salute', 4500],
  ['abbonamenti', 4500],
  ['trasporti', 3578],
]

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

export const ACCOUNTS = [
  { name: 'Conto corrente', owner: 'Tuo', cents: 182040 },
  { name: 'Contanti', owner: 'Tuo', cents: 8500 },
  { name: 'Conto deposito', owner: 'Tuo · conta nei risparmi', cents: 300000 },
  { name: 'Conto corrente del partner', owner: 'Partner', cents: 64080 },
  { name: 'Conto spese di coppia', owner: 'Di entrambi', cents: 42700 },
]
