// Esportazione completa in CSV, pensata per Excel/Numbers in italiano:
// separatore ";", decimali con la virgola, UTF-8 con segno di riconoscimento.
import { CAT } from '../data/categories'
import {
  OWNER_LABEL,
  PEOPLE,
  type Account,
  type Budget,
  type PersonKey,
  type PiggyBank,
  type PiggyMove,
  type Recurrence,
  type Rule,
  type Settings,
  type Tx,
} from '../data/model'
import { computeShares } from './balances'
import { piggyShares } from './piggy'

const BOM = '﻿'

/** 123456 → "1234,56", −4280 → "-42,80" (senza separatore delle migliaia, per i fogli di calcolo). */
export function csvMoney(cents: number): string {
  const abs = Math.abs(cents)
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

/** Testo libero: neutralizza le formule (=, +, -, @) che un foglio di calcolo eseguirebbe. */
export function csvText(value: string | undefined): string {
  const v = value ?? ''
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
}

function field(value: string | number | undefined): string {
  const v = value === undefined ? '' : String(value)
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function toCsv(header: string[], rows: (string | number | undefined)[][]): string {
  return BOM + [header, ...rows].map((r) => r.map(field).join(';')).join('\r\n') + '\r\n'
}

export interface ExportData {
  accounts: Account[]
  txs: Tx[]
  piggyBanks: PiggyBank[]
  piggyMoves: PiggyMove[]
  budgets: Budget[]
  recurrences: Recurrence[]
  rules: Rule[]
  settings: Settings | null
}

export interface ExportFile {
  name: string
  content: string
  rows: number
}

const TYPE_LABEL = { uscita: 'Uscita', entrata: 'Entrata', giroconto: 'Giroconto' } as const
const yes = (v: boolean | undefined) => (v ? 'sì' : '')

export function buildExport(data: ExportData, day: string): ExportFile[] {
  const account = new Map(data.accounts.map((a) => [a.id, a]))
  const piggy = new Map(data.piggyBanks.map((p) => [p.id, p]))
  const sender = (id: string | undefined) => {
    const who: PersonKey | undefined = id ? data.settings?.people[id] : undefined
    return who ? PEOPLE[who].name : ''
  }
  const shares = computeShares(data.accounts, data.txs)

  const files: ExportFile[] = []
  const add = (name: string, header: string[], rows: (string | number | undefined)[][]) =>
    files.push({ name: `nami-${name}-${day}.csv`, content: toCsv(header, rows), rows: rows.length })

  add(
    'movimenti',
    ['Data', 'Tipo', 'Importo', 'Esercente', 'Categoria', 'Conto', 'Conto di arrivo', 'Quota di', 'Fattura', 'Da controllare', 'Spesa fissa', 'Inserito da'],
    data.txs
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [
        t.date,
        TYPE_LABEL[t.type],
        csvMoney(t.type === 'uscita' ? -t.cents : t.cents),
        csvText(t.merchant),
        t.type === 'giroconto' ? '' : CAT[t.category ?? 'altro'].name,
        csvText(account.get(t.accountId)?.name),
        csvText(t.toAccountId ? account.get(t.toAccountId)?.name : undefined),
        PEOPLE[t.who].name,
        yes(t.invoice),
        yes(t.review),
        yes(!!t.recurrenceId),
        sender(t.createdBy),
      ]),
  )

  add(
    'conti',
    ['Conto', 'Titolare', 'Tipo', 'Saldo iniziale Jack', 'Saldo iniziale Fiore', 'Saldo attuale Jack', 'Saldo attuale Fiore', 'Saldo attuale totale'],
    data.accounts.map((a) => {
      const s = shares.get(a.id)!
      return [
        csvText(a.name),
        OWNER_LABEL[a.owner].replace('Di ', ''),
        a.kind,
        csvMoney(a.opening.jack),
        csvMoney(a.opening.fiore),
        csvMoney(s.jack),
        csvMoney(s.fiore),
        csvMoney(s.jack + s.fiore),
      ]
    }),
  )

  add(
    'salvadanai',
    ['Salvadanaio', 'Obiettivo', 'Scadenza', 'Ottenuto il', 'Messo da Jack', 'Messo da Fiore', 'Totale'],
    data.piggyBanks.map((p) => {
      const s = piggyShares(data.piggyMoves, p.id)
      return [csvText(p.name), csvMoney(p.goal), p.deadline, p.achieved, csvMoney(s.jack), csvMoney(s.fiore), csvMoney(s.jack + s.fiore)]
    }),
  )

  add(
    'versamenti-salvadanai',
    ['Data', 'Salvadanaio', 'Tipo', 'Importo', 'Di', 'Conto', 'Nota'],
    data.piggyMoves
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => [
        m.date,
        csvText(piggy.get(m.piggyId)?.name),
        m.type === 'versamento' ? 'Versamento' : 'Prelievo',
        csvMoney(m.type === 'versamento' ? m.cents : -m.cents),
        PEOPLE[m.who].name,
        csvText(account.get(m.accountId)?.name),
        csvText(m.note),
      ]),
  )

  add(
    'budget',
    ['Categoria', 'Limite mensile'],
    data.budgets.map((b) => [CAT[b.category].name, csvMoney(b.limit)]),
  )

  add(
    'spese-fisse',
    ['Spesa', 'Giorno del mese', 'Importo', 'Categoria', 'Conto', 'Dettagli', 'Ultima scadenza'],
    data.recurrences.map((r) => [
      csvText(r.name),
      r.day,
      csvMoney(r.cents),
      CAT[r.category].name,
      csvText(account.get(r.accountId)?.name),
      csvText(r.subs?.map((s) => `${s.name} ${csvMoney(s.cents)}`).join(' | ')),
      r.end,
    ]),
  )

  add(
    'regole',
    ['Esercente', 'Categoria'],
    data.rules.map((r) => [csvText(r.label), CAT[r.category].name]),
  )

  return files
}

/**
 * Su iPhone apre il foglio di condivisione ("Salva su File"); altrove scarica i file uno dopo l'altro.
 * Restituisce false se l'utente ha annullato.
 */
export async function shareOrDownload(files: ExportFile[]): Promise<boolean> {
  const objects = files.map((f) => new File([f.content], f.name, { type: 'text/csv;charset=utf-8' }))
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: objects })) {
    try {
      await navigator.share({ files: objects, title: 'Esportazione NAMI' })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      // Se la condivisione non va, si ripiega sul download normale.
    }
  }
  for (const file of objects) {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    await new Promise((r) => setTimeout(r, 300))
  }
  return true
}
