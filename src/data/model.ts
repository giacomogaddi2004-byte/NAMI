// Forma dei dati una volta decifrati sul telefono. Importi sempre in centesimi.
import type { CategoryKey } from './categories'

export const PEOPLE = {
  jack: { name: 'Jack', color: '#2B50E0', tint: '#E4EAFD' },
  fiore: { name: 'Fiore', color: '#E8553A', tint: '#FDE9E4' },
} as const
export type PersonKey = keyof typeof PEOPLE
export const PERSON_KEYS = Object.keys(PEOPLE) as PersonKey[]

export type Owner = PersonKey | 'entrambi'
/** Vista della home: una persona oppure tutta la coppia. */
export type View = PersonKey | 'coppia'

export type AccountKind = 'corrente' | 'contanti' | 'deposito' | 'tasse'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  owner: Owner
  /** Saldo iniziale. Nei conti di entrambi è diviso per quota; negli altri conta solo quello del titolare. */
  opening: Record<PersonKey, number>
  order: number
}

export type TxType = 'uscita' | 'entrata' | 'giroconto'

export interface Tx {
  id: string
  type: TxType
  /** Sempre positivo: il segno lo dà il tipo. */
  cents: number
  /** Giorno in formato AAAA-MM-GG (fuso Europe/Rome). */
  date: string
  accountId: string
  /** Solo giroconti: conto di arrivo. */
  toAccountId?: string
  merchant: string
  category?: CategoryKey
  /** Di chi è la quota sul conto di partenza (conta nei conti di entrambi). */
  who: PersonKey
  /** Solo giroconti: di chi è la quota sul conto di arrivo, se diversa. */
  toWho?: PersonKey
  /** Solo entrate: incasso con fattura, quindi con quota per le tasse. */
  invoice?: boolean
  /** Esercente sconosciuto e categoria non scelta: da controllare. */
  review?: boolean
  /** Giroconto automatico verso il conto tasse: id dell'entrata che l'ha generato. */
  taxOf?: string
  createdBy?: string
}

/** Regola "esercente → categoria" scelta dalla coppia. */
export interface Rule {
  id: string
  /** Nome dell'esercente in forma normalizzata (vedi `normalizeMerchant`). */
  pattern: string
  /** Nome come è stato scritto, da mostrare. */
  label: string
  category: CategoryKey
}

export interface Settings {
  /** Chi è chi: id utente Supabase → persona. */
  people: Record<string, PersonKey>
}

export const OWNER_LABEL: Record<Owner, string> = { jack: 'Di Jack', fiore: 'Di Fiore', entrambi: 'Di entrambi' }

/** Conti creati al primo avvio (i saldi iniziali li inserisce l'utente). */
export const DEFAULT_ACCOUNTS: Pick<Account, 'name' | 'kind' | 'owner'>[] = [
  { name: 'Conto corrente', kind: 'corrente', owner: 'jack' },
  { name: 'Conto spese di coppia', kind: 'corrente', owner: 'jack' },
  { name: 'Conto corrente di Fiore', kind: 'corrente', owner: 'fiore' },
  { name: 'Contanti', kind: 'contanti', owner: 'entrambi' },
  { name: 'Conto deposito', kind: 'deposito', owner: 'entrambi' },
  { name: 'Conto tasse', kind: 'tasse', owner: 'entrambi' },
]
