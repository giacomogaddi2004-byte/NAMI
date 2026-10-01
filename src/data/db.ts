// Copia locale dei dati (sempre cifrata) e coda delle modifiche da inviare.
import Dexie, { type Table } from 'dexie'

export type TableName = 'accounts' | 'transactions' | 'settings' | 'rules' | 'recurrences'

/** Una riga così come sta sul server: il contenuto vero è in `payload`, cifrato. */
export interface Row {
  id?: string
  household_id: string
  payload: string
  updated_at?: string
  deleted_at?: string | null
  account_id?: string
  to_account_id?: string | null
  date?: string
  created_by?: string
  /** Solo ricorrenze: giorno di scadenza (in chiaro, per le notifiche). */
  day?: number
  /** Solo movimenti generati da una spesa fissa. */
  recurrence_id?: string | null
  recurrence_month?: string | null
}

export interface OutboxItem {
  seq?: number
  table: TableName
  row: Row
}

/** Colonna che identifica una riga in ogni tabella. */
export const PRIMARY_KEY: Record<TableName, 'id' | 'household_id'> = {
  accounts: 'id',
  transactions: 'id',
  settings: 'household_id',
  rules: 'id',
  recurrences: 'id',
}
export const TABLES = Object.keys(PRIMARY_KEY) as TableName[]

export const rowKey = (table: TableName, row: Row): string => row[PRIMARY_KEY[table]] as string

export const db = new Dexie('nami-data') as Dexie & {
  accounts: Table<Row, string>
  transactions: Table<Row, string>
  settings: Table<Row, string>
  rules: Table<Row, string>
  recurrences: Table<Row, string>
  outbox: Table<OutboxItem, number>
  meta: Table<{ key: string; value: string }, string>
}

db.version(1).stores({
  accounts: 'id',
  transactions: 'id',
  settings: 'household_id',
  outbox: '++seq',
  meta: 'key',
})
db.version(2).stores({ rules: 'id' })
db.version(3).stores({ recurrences: 'id' })

/** Cancella la copia locale (all'uscita dall'account). */
export async function clearLocalData(): Promise<void> {
  await Promise.all([db.accounts.clear(), db.transactions.clear(), db.settings.clear(), db.rules.clear(), db.recurrences.clear(), db.outbox.clear(), db.meta.clear()])
}
