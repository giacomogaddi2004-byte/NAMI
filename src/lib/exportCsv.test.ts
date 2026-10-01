import { describe, expect, it } from 'vitest'
import type { Account, PiggyBank, PiggyMove, Tx } from '../data/model'
import { buildExport, csvMoney, csvText, toCsv, type ExportData } from './exportCsv'

describe('formati', () => {
  it('importi con la virgola, senza migliaia, con segno', () => {
    expect(csvMoney(123456)).toBe('1234,56')
    expect(csvMoney(-4280)).toBe('-42,80')
    expect(csvMoney(5)).toBe('0,05')
    expect(csvMoney(0)).toBe('0,00')
  })

  it('neutralizza le formule nei testi liberi', () => {
    expect(csvText('=SOMMA(A1:A9)')).toBe("'=SOMMA(A1:A9)")
    expect(csvText('+39 333')).toBe("'+39 333")
    expect(csvText('Esselunga')).toBe('Esselunga')
    expect(csvText(undefined)).toBe('')
  })

  it('racchiude tra virgolette i campi con ; o virgolette e usa il segno UTF-8', () => {
    const csv = toCsv(['a', 'b'], [['x;y', 'dice "ciao"'], [1, undefined]])
    expect(csv.startsWith('﻿a;b\r\n')).toBe(true)
    expect(csv).toContain('"x;y";"dice ""ciao"""')
    expect(csv.endsWith('1;\r\n')).toBe(true)
  })
})

const acc = (id: string, name: string, kind: Account['kind'], owner: Account['owner'], jack = 0, fiore = 0): Account => ({
  id, name, kind, owner, opening: { jack, fiore }, order: 0,
})

describe('esportazione completa', () => {
  const accounts = [acc('cc', 'Conto corrente', 'corrente', 'jack', 100000), acc('tasse', 'Conto tasse', 'tasse', 'entrambi')]
  const txs: Tx[] = [
    { id: '2', type: 'entrata', cents: 125000, date: '2026-10-16', accountId: 'cc', merchant: 'Cliente; Rossi', category: 'lavoro', who: 'jack', invoice: true, createdBy: 'u1' },
    { id: '1', type: 'uscita', cents: 4280, date: '2026-10-05', accountId: 'cc', merchant: '=BAD()', category: 'supermercato', who: 'jack', review: true },
    { id: '3', type: 'giroconto', cents: 37500, date: '2026-10-16', accountId: 'cc', toAccountId: 'tasse', merchant: '30% di Cliente', who: 'jack', toWho: 'jack', taxOf: '2' },
  ]
  const piggyBanks: PiggyBank[] = [{ id: 'p', name: 'Computer', color: '#000', goal: 250000, deadline: '2027-01-31', order: 0 }]
  const piggyMoves: PiggyMove[] = [{ id: 'm', piggyId: 'p', type: 'versamento', cents: 50000, date: '2026-10-12', accountId: 'cc', who: 'jack' }]
  const data: ExportData = {
    accounts, txs, piggyBanks, piggyMoves,
    budgets: [{ id: 'b', category: 'cibo', limit: 13000 }],
    recurrences: [{ id: 'r', name: 'Abbonamenti', cents: 1998, day: 1, category: 'abbonamenti', accountId: 'cc', who: 'jack', start: '2026-10-02', subs: [{ name: 'Film', cents: 899 }, { name: 'Musica', cents: 1099 }] }],
    rules: [{ id: 'x', pattern: 'bar', label: 'Bar Centrale', category: 'cibo' }],
    settings: { people: { u1: 'jack' } },
  }
  const files = buildExport(data, '2026-10-18')
  const byName = (part: string) => files.find((f) => f.name.includes(part))!

  it('produce sette file con la data nel nome', () => {
    expect(files.map((f) => f.name)).toEqual([
      'nami-movimenti-2026-10-18.csv',
      'nami-conti-2026-10-18.csv',
      'nami-salvadanai-2026-10-18.csv',
      'nami-versamenti-salvadanai-2026-10-18.csv',
      'nami-budget-2026-10-18.csv',
      'nami-spese-fisse-2026-10-18.csv',
      'nami-regole-2026-10-18.csv',
    ])
  })

  it('i movimenti sono in ordine di data, con segno e nomi leggibili', () => {
    const lines = byName('movimenti').content.trim().split('\r\n')
    expect(lines).toHaveLength(4)
    expect(lines[1]).toBe("2026-10-05;Uscita;-42,80;'=BAD();Supermercato;Conto corrente;;Jack;;sì;;")
    expect(lines[2]).toBe('2026-10-16;Entrata;1250,00;"Cliente; Rossi";Lavoro;Conto corrente;;Jack;sì;;;Jack')
    expect(lines[3]).toContain('Giroconto;375,00;')
    expect(lines[3]).toContain('Conto corrente;Conto tasse')
  })

  it('i conti mostrano saldo iniziale e attuale', () => {
    const lines = byName('conti').content.trim().split('\r\n')
    expect(lines[1].startsWith('Conto corrente;Jack;corrente;1000,00;0,00;')).toBe(true)
    // 1000 + 1250 entrata − 42,80 − 375 giroconto = 1832,20
    expect(lines[1].split(';').slice(-1)[0]).toBe('1832,20')
    expect(lines[2].split(';').slice(-1)[0]).toBe('375,00')
  })

  it('salvadanai, budget, spese fisse e regole', () => {
    expect(byName('nami-salvadanai').content).toContain('Computer;2500,00;2027-01-31;;500,00;0,00;500,00')
    expect(byName('versamenti').content).toContain('2026-10-12;Computer;Versamento;500,00;Jack;Conto corrente;')
    expect(byName('budget').content).toContain('Cibo fuori;130,00')
    expect(byName('spese-fisse').content).toContain('Abbonamenti;1;19,98;Abbonamenti;Conto corrente;Film 8,99 | Musica 10,99')
    expect(byName('regole').content).toContain('Bar Centrale;Cibo fuori')
  })
})
