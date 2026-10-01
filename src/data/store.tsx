// Dati dell'app: letti dalla copia locale cifrata, scritti prima in locale e poi
// inviati a Supabase appena c'è rete (coda "outbox").
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DEMO, useSession } from '../auth/session'
import { decryptJson, encryptJson } from '../lib/crypto'
import { TAX_PERCENT, taxShare } from '../lib/money'
import { errorMessage, supabase } from '../lib/supabase'
import { db, PRIMARY_KEY, rowKey, TABLES, type OutboxItem, type Row, type TableName } from './db'
import type { Account, PersonKey, Settings, Tx } from './model'

const SYNC_EVERY_MS = 60_000
const PAGE = 1000

interface Data {
  /** La copia locale è stata letta. */
  loaded: boolean
  /** Almeno uno scambio con il server è riuscito da quando l'app è aperta. */
  synced: boolean
  syncError: string | null
  /** Modifiche non ancora inviate. */
  pending: number
  me: PersonKey | null
  settings: Settings | null
  accounts: Account[]
  /** Movimenti dal più recente. */
  txs: Tx[]
  saveSettings: (settings: Settings) => Promise<void>
  saveAccounts: (accounts: Account[]) => Promise<void>
  /** Salva un movimento; per le entrate con fattura aggiorna anche il giroconto verso il conto tasse. */
  saveTx: (tx: Tx) => Promise<void>
  deleteTx: (id: string) => Promise<void>
  syncNow: () => void
}

const Ctx = createContext<Data | null>(null)

type AccountPayload = Omit<Account, 'id'>
type TxPayload = Omit<Tx, 'id' | 'date' | 'accountId' | 'toAccountId' | 'createdBy'>

export function DataProvider({ children }: { children: ReactNode }) {
  const { key, householdId, user } = useSession()
  const [loaded, setLoaded] = useState(false)
  const [synced, setSynced] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const running = useRef(false)
  const again = useRef(false)

  /** Rilegge la copia locale e la decifra. */
  const reload = useCallback(async () => {
    if (!key || !householdId) return
    const open = async <T,>(table: TableName, row: Row): Promise<T | null> => {
      try {
        return await decryptJson<T>(key, row.payload, `${table}:${rowKey(table, row)}`)
      } catch {
        console.warn(`Riga illeggibile in ${table}`, rowKey(table, row))
        return null
      }
    }
    const [accountRows, txRows, settingsRow] = await Promise.all([db.accounts.toArray(), db.transactions.toArray(), db.settings.get(householdId)])

    const nextAccounts: Account[] = []
    for (const row of accountRows) {
      const p = row.deleted_at ? null : await open<AccountPayload>('accounts', row)
      if (p) nextAccounts.push({ ...p, id: row.id! })
    }
    const nextTxs: Tx[] = []
    for (const row of txRows) {
      const p = row.deleted_at ? null : await open<TxPayload>('transactions', row)
      if (p) nextTxs.push({ ...p, id: row.id!, date: row.date!, accountId: row.account_id!, toAccountId: row.to_account_id ?? undefined, createdBy: row.created_by })
    }
    setAccounts(nextAccounts.sort((a, b) => a.order - b.order))
    setTxs(nextTxs.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)))
    setSettings(settingsRow ? await open<Settings>('settings', settingsRow) : null)
    setPending(await db.outbox.count())
    setLoaded(true)
  }, [key, householdId])

  /** Invia la coda, poi scarica le novità. */
  const sync = useCallback(async () => {
    if (!householdId) return
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    try {
      do {
        again.current = false
        if (DEMO) {
          await db.outbox.clear()
          await reload()
          break
        }
        for (const item of await db.outbox.orderBy('seq').toArray()) {
          // `updated_at` lo mette il server, `created_by` resta di chi ha creato la riga.
          const { updated_at: _u, created_by: _c, ...row } = item.row
          const { error } = await supabase.from(item.table).upsert(row, { onConflict: PRIMARY_KEY[item.table] })
          if (error) throw error
          await db.outbox.delete(item.seq!)
        }
        const waiting = new Set((await db.outbox.toArray()).map((i) => `${i.table}:${rowKey(i.table, i.row)}`))
        for (const table of TABLES) {
          let cursor = (await db.meta.get(`cursor:${table}`))?.value ?? '1970-01-01T00:00:00Z'
          for (;;) {
            const { data, error } = await supabase.from(table).select('*').gt('updated_at', cursor).order('updated_at').limit(PAGE)
            if (error) throw error
            const rows = (data ?? []) as Row[]
            if (rows.length === 0) break
            // Una riga con modifiche locali non ancora inviate non viene sovrascritta.
            await db.table<Row, string>(table).bulkPut(rows.filter((r) => !waiting.has(`${table}:${rowKey(table, r)}`)))
            cursor = rows[rows.length - 1].updated_at!
            await db.meta.put({ key: `cursor:${table}`, value: cursor })
            if (rows.length < PAGE) break
          }
        }
        await reload()
      } while (again.current)
      setSynced(true)
      setSyncError(null)
    } catch (e) {
      setSyncError(errorMessage(e))
      setPending(await db.outbox.count())
    } finally {
      running.current = false
    }
  }, [householdId, reload])

  useEffect(() => {
    if (!key || !householdId) return
    reload().then(sync)
    const onWake = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener('online', onWake)
    document.addEventListener('visibilitychange', onWake)
    const timer = setInterval(onWake, SYNC_EVERY_MS)
    return () => {
      window.removeEventListener('online', onWake)
      document.removeEventListener('visibilitychange', onWake)
      clearInterval(timer)
    }
  }, [key, householdId, reload, sync])

  /** Scrive in locale, mette in coda e prova subito a inviare. */
  const write = useCallback(
    async (items: OutboxItem[]) => {
      await db.transaction('rw', [db.accounts, db.transactions, db.settings, db.outbox], async () => {
        for (const item of items) {
          await db.table<Row, string>(item.table).put(item.row)
          await db.outbox.add(item)
        }
      })
      await reload()
      void sync()
    },
    [reload, sync],
  )

  const seal = useCallback(
    async (table: TableName, id: string, payload: unknown, columns: Partial<Row> = {}): Promise<OutboxItem> => {
      if (!key || !householdId) throw new Error('Chiave non disponibile')
      const row: Row = { household_id: householdId, payload: await encryptJson(key, payload, `${table}:${id}`), deleted_at: null, ...columns }
      if (PRIMARY_KEY[table] === 'id') row.id = id
      else delete row.deleted_at
      return { table, row }
    },
    [key, householdId],
  )

  const sealTx = useCallback(
    (tx: Tx, deleted = false) => {
      const { id, date, accountId, toAccountId, createdBy: _c, ...payload } = tx
      return seal('transactions', id, payload satisfies TxPayload, {
        account_id: accountId,
        to_account_id: toAccountId ?? null,
        date,
        deleted_at: deleted ? new Date().toISOString() : null,
      })
    },
    [seal],
  )

  const saveSettings = useCallback(
    async (next: Settings) => {
      if (householdId) await write([await seal('settings', householdId, next)])
    },
    [householdId, seal, write],
  )

  const saveAccounts = useCallback(
    async (list: Account[]) => {
      await write(await Promise.all(list.map(({ id, ...payload }) => seal('accounts', id, payload satisfies AccountPayload))))
    },
    [seal, write],
  )

  const saveTx = useCallback(
    async (tx: Tx) => {
      const items = [await sealTx(tx)]
      const linked = txs.find((t) => t.taxOf === tx.id)
      const taxAccount = accounts.find((a) => a.kind === 'tasse')
      if (tx.type === 'entrata' && tx.invoice && taxAccount && tx.accountId !== taxAccount.id) {
        items.push(
          await sealTx({
            id: linked?.id ?? crypto.randomUUID(),
            type: 'giroconto',
            cents: taxShare(tx.cents),
            date: tx.date,
            accountId: tx.accountId,
            toAccountId: taxAccount.id,
            merchant: `${TAX_PERCENT}% di ${tx.merchant || 'incasso'}`,
            who: tx.who,
            toWho: tx.who,
            taxOf: tx.id,
          }),
        )
      } else if (linked) {
        items.push(await sealTx(linked, true))
      }
      await write(items)
    },
    [accounts, txs, sealTx, write],
  )

  const deleteTx = useCallback(
    async (id: string) => {
      const doomed = txs.filter((t) => t.id === id || t.taxOf === id)
      await write(await Promise.all(doomed.map((t) => sealTx(t, true))))
    },
    [txs, sealTx, write],
  )

  const me = (user && settings?.people[user.id]) || null
  const value = useMemo<Data>(
    () => ({ loaded, synced, syncError, pending, me, settings, accounts, txs, saveSettings, saveAccounts, saveTx, deleteTx, syncNow: sync }),
    [loaded, synced, syncError, pending, me, settings, accounts, txs, saveSettings, saveAccounts, saveTx, deleteTx, sync],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): Data {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData fuori da DataProvider')
  return ctx
}
