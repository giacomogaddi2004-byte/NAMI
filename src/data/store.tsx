// Dati dell'app: letti dalla copia locale cifrata, scritti prima in locale e poi
// inviati a Supabase appena c'è rete (coda "outbox").
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DEMO, useSession } from '../auth/session'
import { decryptJson, encryptJson } from '../lib/crypto'
import { TAX_PERCENT, taxShare } from '../lib/money'
import { errorMessage, supabase } from '../lib/supabase'
import { db, PRIMARY_KEY, rowKey, TABLES, type OutboxItem, type Row, type TableName } from './db'
import type { Account, Budget, PersonKey, PiggyBank, PiggyMove, Recurrence, Rule, Settings, Tx } from './model'
import type { CategoryKey } from './categories'
import { stableId } from '../lib/ids'
import { piggyShares, settlements } from '../lib/piggy'
import { today } from '../lib/dates'
import { dueDates, occurrenceId, occurrenceKey } from '../lib/recurrences'

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
  /** Regole esercente → categoria della coppia. */
  rules: Rule[]
  /** Spese fisse, in ordine di giorno. */
  recurrences: Recurrence[]
  /** Registrazioni già fatte (anche se poi eliminate): chiavi `occurrenceKey`. */
  occurrences: Set<string>
  piggyBanks: PiggyBank[]
  piggyMoves: PiggyMove[]
  /** Budget mensili attivi (uno per categoria). */
  budgets: Budget[]
  saveSettings: (settings: Settings) => Promise<void>
  saveAccounts: (accounts: Account[]) => Promise<void>
  /** Salva un movimento; per le entrate con fattura aggiorna anche il giroconto verso il conto tasse. */
  saveTx: (tx: Tx) => Promise<void>
  deleteTx: (id: string) => Promise<void>
  /** Aggiorna più movimenti insieme (es. cambio di categoria), senza toccare i giroconti delle tasse. */
  saveTxs: (list: Tx[]) => Promise<void>
  saveRule: (rule: Rule) => Promise<void>
  deleteRule: (rule: Rule) => Promise<void>
  saveRecurrences: (list: Recurrence[]) => Promise<void>
  /** Elimina la spesa fissa; i movimenti già registrati restano. */
  deleteRecurrence: (rec: Recurrence) => Promise<void>
  savePiggy: (piggy: PiggyBank) => Promise<void>
  /** Elimina il salvadanaio e i suoi movimenti: i soldi tornano disponibili. */
  deletePiggy: (piggy: PiggyBank) => Promise<void>
  saveMove: (move: PiggyMove) => Promise<void>
  deleteMove: (move: PiggyMove) => Promise<void>
  /** Imposta i budget: una categoria senza limite (o a zero) perde il suo budget. */
  setBudgets: (limits: Partial<Record<CategoryKey, number>>) => Promise<void>
  /** Registra l'acquisto, libera i soldi del salvadanaio e lo segna come ottenuto, tutto insieme. */
  completePiggy: (piggy: PiggyBank, purchase: Tx) => Promise<void>
  syncNow: () => void
}

const Ctx = createContext<Data | null>(null)

type AccountPayload = Omit<Account, 'id'>
type RulePayload = Omit<Rule, 'id'>
type BudgetPayload = Omit<Budget, 'id'>
type PiggyPayload = Omit<PiggyBank, 'id'>
type MovePayload = Omit<PiggyMove, 'id' | 'piggyId' | 'accountId' | 'date' | 'createdBy'>
type RecurrencePayload = Omit<Recurrence, 'id' | 'accountId' | 'day'>
type TxPayload = Omit<Tx, 'id' | 'date' | 'accountId' | 'toAccountId' | 'createdBy' | 'recurrenceId' | 'recurrenceMonth'>

export function DataProvider({ children }: { children: ReactNode }) {
  const { key, householdId, user } = useSession()
  const [loaded, setLoaded] = useState(false)
  const [synced, setSynced] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [recurrences, setRecurrences] = useState<Recurrence[]>([])
  const [occurrences, setOccurrences] = useState<Set<string>>(new Set())
  const [piggyBanks, setPiggyBanks] = useState<PiggyBank[]>([])
  const [piggyMoves, setPiggyMoves] = useState<PiggyMove[]>([])
  const [budgets, setBudgetList] = useState<Budget[]>([])
  const generating = useRef(false)
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
    const [accountRows, txRows, ruleRows, recurrenceRows, piggyRows, moveRows, budgetRows, settingsRow] = await Promise.all([
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.rules.toArray(),
      db.recurrences.toArray(),
      db.piggy_banks.toArray(),
      db.piggy_moves.toArray(),
      db.budgets.toArray(),
      db.settings.get(householdId),
    ])

    const nextAccounts: Account[] = []
    for (const row of accountRows) {
      const p = row.deleted_at ? null : await open<AccountPayload>('accounts', row)
      if (p) nextAccounts.push({ ...p, id: row.id! })
    }
    const nextTxs: Tx[] = []
    for (const row of txRows) {
      const p = row.deleted_at ? null : await open<TxPayload>('transactions', row)
      if (p) {
        nextTxs.push({
          ...p,
          id: row.id!,
          date: row.date!,
          accountId: row.account_id!,
          toAccountId: row.to_account_id ?? undefined,
          createdBy: row.created_by,
          recurrenceId: row.recurrence_id ?? undefined,
          recurrenceMonth: row.recurrence_month ?? undefined,
        })
      }
    }
    // Anche i movimenti eliminati contano: una spesa fissa cancellata a mano non deve ricomparire.
    setOccurrences(new Set(txRows.filter((r) => r.recurrence_id && r.recurrence_month).map((r) => `${r.recurrence_id}:${r.recurrence_month}`)))
    const nextRecurrences: Recurrence[] = []
    for (const row of recurrenceRows) {
      const p = row.deleted_at ? null : await open<RecurrencePayload>('recurrences', row)
      if (p) nextRecurrences.push({ ...p, id: row.id!, accountId: row.account_id!, day: row.day! })
    }
    setRecurrences(nextRecurrences.sort((a, b) => a.day - b.day || a.name.localeCompare(b.name, 'it')))
    const nextRules: Rule[] = []
    for (const row of ruleRows) {
      const p = row.deleted_at ? null : await open<RulePayload>('rules', row)
      if (p) nextRules.push({ ...p, id: row.id! })
    }
    setRules(nextRules.sort((a, b) => a.label.localeCompare(b.label, 'it')))
    const nextPiggies: PiggyBank[] = []
    for (const row of piggyRows) {
      const p = row.deleted_at ? null : await open<PiggyPayload>('piggy_banks', row)
      if (p) nextPiggies.push({ ...p, id: row.id! })
    }
    const nextMoves: PiggyMove[] = []
    for (const row of moveRows) {
      const p = row.deleted_at ? null : await open<MovePayload>('piggy_moves', row)
      if (p) nextMoves.push({ ...p, id: row.id!, piggyId: row.piggy_bank_id!, accountId: row.account_id!, date: row.date!, createdBy: row.created_by })
    }
    const nextBudgets: Budget[] = []
    for (const row of budgetRows) {
      const p = row.deleted_at ? null : await open<BudgetPayload>('budgets', row)
      if (p) nextBudgets.push({ ...p, id: row.id! })
    }
    setBudgetList(nextBudgets)
    setPiggyBanks(nextPiggies.sort((a, b) => a.order - b.order))
    setPiggyMoves(nextMoves.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)))
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
      await db.transaction('rw', [db.accounts, db.transactions, db.settings, db.rules, db.recurrences, db.piggy_banks, db.piggy_moves, db.budgets, db.outbox], async () => {
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
      const { id, date, accountId, toAccountId, createdBy: _c, recurrenceId, recurrenceMonth, ...payload } = tx
      return seal('transactions', id, payload satisfies TxPayload, {
        account_id: accountId,
        to_account_id: toAccountId ?? null,
        date,
        recurrence_id: recurrenceId ?? null,
        recurrence_month: recurrenceMonth ?? null,
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

  const saveTxs = useCallback(async (list: Tx[]) => write(await Promise.all(list.map((t) => sealTx(t)))), [sealTx, write])

  const saveRule = useCallback(
    async ({ id, ...payload }: Rule) => write([await seal('rules', id, payload satisfies RulePayload)]),
    [seal, write],
  )

  const deleteRule = useCallback(
    async ({ id, ...payload }: Rule) => write([await seal('rules', id, payload, { deleted_at: new Date().toISOString() })]),
    [seal, write],
  )

  const sealRecurrence = useCallback(
    ({ id, accountId, day, ...payload }: Recurrence, deleted = false) =>
      seal('recurrences', id, payload satisfies RecurrencePayload, {
        account_id: accountId,
        day,
        starts_on: payload.start,
        ends_on: payload.end ?? null,
        deleted_at: deleted ? new Date().toISOString() : null,
      }),
    [seal],
  )

  const saveRecurrences = useCallback(async (list: Recurrence[]) => write(await Promise.all(list.map((r) => sealRecurrence(r)))), [sealRecurrence, write])

  const deleteRecurrence = useCallback(async (rec: Recurrence) => write([await sealRecurrence(rec, true)]), [sealRecurrence, write])

  const sealPiggy = useCallback(
    ({ id, ...payload }: PiggyBank, deleted = false) =>
      seal('piggy_banks', id, payload satisfies PiggyPayload, { deleted_at: deleted ? new Date().toISOString() : null }),
    [seal],
  )

  const sealMove = useCallback(
    ({ id, piggyId, accountId, date, createdBy: _c, ...payload }: PiggyMove, deleted = false) =>
      seal('piggy_moves', id, payload satisfies MovePayload, {
        piggy_bank_id: piggyId,
        account_id: accountId,
        date,
        deleted_at: deleted ? new Date().toISOString() : null,
      }),
    [seal],
  )

  const setBudgets = useCallback(
    async (limits: Partial<Record<CategoryKey, number>>) => {
      const items: OutboxItem[] = []
      for (const [category, limit] of Object.entries(limits) as [CategoryKey, number | undefined][]) {
        const id = await stableId(`budget:${category}`)
        const current = budgets.find((b) => b.category === category)
        if (limit && limit > 0) {
          if (current?.limit !== limit) items.push(await seal('budgets', id, { category, limit } satisfies BudgetPayload))
        } else if (current) {
          items.push(await seal('budgets', id, { category, limit: current.limit } satisfies BudgetPayload, { deleted_at: new Date().toISOString() }))
        }
      }
      if (items.length > 0) await write(items)
    },
    [budgets, seal, write],
  )

  const savePiggy = useCallback(async (piggy: PiggyBank) => write([await sealPiggy(piggy)]), [sealPiggy, write])

  const deletePiggy = useCallback(
    async (piggy: PiggyBank) => {
      const moves = piggyMoves.filter((m) => m.piggyId === piggy.id)
      await write([...(await Promise.all(moves.map((m) => sealMove(m, true)))), await sealPiggy(piggy, true)])
    },
    [piggyMoves, sealMove, sealPiggy, write],
  )

  const saveMove = useCallback(async (move: PiggyMove) => write([await sealMove(move)]), [sealMove, write])

  const deleteMove = useCallback(async (move: PiggyMove) => write([await sealMove(move, true)]), [sealMove, write])

  const completePiggy = useCallback(
    async (piggy: PiggyBank, purchase: Tx) => {
      // I soldi di ciascuno tornano disponibili: la spesa li scala una volta sola.
      const shares = piggyShares(piggyMoves, piggy.id)
      const releases: PiggyMove[] = (Object.keys(shares) as PersonKey[])
        .filter((who) => shares[who] > 0)
        .map((who) => ({
          id: crypto.randomUUID(),
          piggyId: piggy.id,
          type: 'prelievo',
          cents: shares[who],
          date: purchase.date,
          accountId: purchase.accountId,
          who,
          note: 'Ottenuto',
        }))
      // Chi non ha pagato gira la sua parte a chi ha pagato: un giroconto dal suo conto corrente.
      const transfers: Tx[] = settlements(accounts, shares, purchase.who, purchase.accountId).map((s) => ({
        id: crypto.randomUUID(),
        type: 'giroconto',
        cents: s.cents,
        date: purchase.date,
        accountId: s.fromAccountId,
        toAccountId: purchase.accountId,
        merchant: `Pareggio ${piggy.name}`,
        who: s.who,
        toWho: purchase.who,
      }))
      await write([
        await sealTx(purchase),
        ...(await Promise.all(transfers.map((t) => sealTx(t)))),
        ...(await Promise.all(releases.map((m) => sealMove(m)))),
        await sealPiggy({ ...piggy, achieved: purchase.date }),
      ])
    },
    [accounts, piggyMoves, sealMove, sealPiggy, sealTx, write],
  )

  // Spese fisse: alla prima apertura dal giorno di scadenza in poi crea i movimenti mancanti.
  // Aspetta il primo scambio con il server (o che fallisca) per sapere cosa ha già registrato il partner.
  useEffect(() => {
    if (!loaded || !(synced || syncError) || generating.current) return
    const day = today()
    const missing = recurrences.flatMap((rec) => dueDates(rec, day).filter((due) => !occurrences.has(occurrenceKey(rec.id, due))).map((due) => ({ rec, due })))
    if (missing.length === 0) return
    generating.current = true
    void (async () => {
      try {
        const items = []
        for (const { rec, due } of missing) {
          const account = accounts.find((a) => a.id === rec.accountId)
          if (!account) continue
          items.push(
            await sealTx({
              id: await occurrenceId(rec.id, due),
              type: 'uscita',
              cents: rec.cents,
              date: due,
              accountId: rec.accountId,
              merchant: rec.name,
              category: rec.category,
              who: account.owner === 'entrambi' ? rec.who : account.owner,
              recurrenceId: rec.id,
              recurrenceMonth: `${due.slice(0, 7)}-01`,
            }),
          )
        }
        if (items.length > 0) await write(items)
      } finally {
        generating.current = false
      }
    })()
  }, [loaded, synced, syncError, recurrences, occurrences, accounts, sealTx, write])

  const me = (user && settings?.people[user.id]) || null
  const value = useMemo<Data>(
    () => ({ loaded, synced, syncError, pending, me, settings, accounts, txs, rules, recurrences, occurrences, piggyBanks, piggyMoves, budgets, saveSettings, saveAccounts, saveTx, deleteTx, saveTxs, saveRule, deleteRule, saveRecurrences, deleteRecurrence, savePiggy, deletePiggy, saveMove, deleteMove, setBudgets, completePiggy, syncNow: sync }),
    [loaded, synced, syncError, pending, me, settings, accounts, txs, rules, recurrences, occurrences, piggyBanks, piggyMoves, budgets, saveSettings, saveAccounts, saveTx, deleteTx, saveTxs, saveRule, deleteRule, saveRecurrences, deleteRecurrence, savePiggy, deletePiggy, saveMove, deleteMove, setBudgets, completePiggy, sync],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): Data {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData fuori da DataProvider')
  return ctx
}
