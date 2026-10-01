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
  /** Movimento creato da una spesa fissa: quale, e per quale mese ("AAAA-MM-01"). */
  recurrenceId?: string
  recurrenceMonth?: string
  createdBy?: string
}

/** Spesa fissa mensile, registrata da sola alla scadenza. */
export interface Recurrence {
  id: string
  name: string
  cents: number
  /** Giorno del mese, da 1 a 31. */
  day: number
  category: CategoryKey
  accountId: string
  /** Di chi è la quota, se il conto è di entrambi. */
  who: PersonKey
  /** Primo giorno dal quale la spesa viene registrata ("AAAA-MM-GG"). */
  start: string
  /** Ultimo giorno in cui può scadere ("AAAA-MM-GG"): per le rate. Vuoto = non finisce mai. */
  end?: string
  /** Dettagli di una voce unica (es. i singoli abbonamenti): l'importo è la loro somma. */
  subs?: { name: string; cents: number }[]
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

/** Budget mensile di una categoria di spesa, comune alla coppia. */
export interface Budget {
  /** Id stabile ricavato dalla categoria: un solo budget per categoria, anche se due telefoni lo creano insieme. */
  id: string
  category: CategoryKey
  /** Limite mensile in centesimi. */
  limit: number
}

/** Salvadanaio virtuale di coppia: i soldi restano sul conto ma escono dal saldo disponibile. */
export interface PiggyBank {
  id: string
  name: string
  /** Colore dell'intestazione (esadecimale, es. "#7C4DDB"). */
  color: string
  /** Obiettivo in centesimi. */
  goal: number
  /** Data obiettivo facoltativa ("AAAA-MM-GG"). */
  deadline?: string
  /** Giorno in cui l'obiettivo è stato ottenuto (acquisto registrato). */
  achieved?: string
  order: number
}

/** Versamento o prelievo di una persona: la quota è sempre personale. */
export interface PiggyMove {
  id: string
  piggyId: string
  type: 'versamento' | 'prelievo'
  /** Sempre positivo: il segno lo dà il tipo. */
  cents: number
  date: string
  /** Conto da cui arrivano i soldi (solo informativo: non si spostano). */
  accountId: string
  who: PersonKey
  note?: string
  createdBy?: string
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
