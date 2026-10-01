import { describe, expect, it } from 'vitest'
import type { Rule, Tx } from '../data/model'
import { categoryFor, matches, normalizeMerchant, sameMerchant } from './rules'

const rule = (label: string, category: Rule['category']): Rule => ({ id: label, pattern: normalizeMerchant(label), label, category })

describe('normalizeMerchant', () => {
  it('toglie maiuscole, accenti e simboli', () => {
    expect(normalizeMerchant('ESSELUNGA S.p.A. – Milano')).toBe('esselunga s p a milano')
    expect(normalizeMerchant('  Caffè   Però ')).toBe('caffe pero')
    expect(normalizeMerchant("McDonald's")).toBe('mcdonald s')
  })
})

describe('categoryFor', () => {
  it('riconosce gli esercenti dell’elenco iniziale', () => {
    expect(categoryFor('Esselunga', [])).toBe('supermercato')
    expect(categoryFor('Glovo', [])).toBe('cibo')
    expect(categoryFor('Telepass', [])).toBe('macchina')
    expect(categoryFor('Trenitalia', [])).toBe('trasporti')
    expect(categoryFor('Q8', [])).toBe('macchina')
  })

  it('riconosce i nomi lunghi che arrivano dalle carte', () => {
    expect(categoryFor('ESSELUNGA MILANO VIA RUBENS', [])).toBe('supermercato')
    expect(categoryFor('LIDL 1234 TORINO', [])).toBe('supermercato')
    expect(categoryFor("MCDONALD'S ROMA TERMINI", [])).toBe('cibo')
  })

  it('non si fa ingannare da pezzi di parola', () => {
    expect(categoryFor('Equipe Sport', [])).toBeNull()
    expect(categoryFor('Capitan Uncino', [])).toBeNull()
    expect(matches('ip gruppo api', 'ip')).toBe(true)
  })

  it('preferisce la regola più specifica', () => {
    expect(categoryFor('Conad Carburanti', [])).toBe('macchina')
    expect(categoryFor('Conad City', [])).toBe('supermercato')
  })

  it('restituisce null per esercenti sconosciuti o vuoti', () => {
    expect(categoryFor('Bar Centrale', [])).toBeNull()
    expect(categoryFor('   ', [])).toBeNull()
  })

  it('le regole della coppia vincono sull’elenco iniziale', () => {
    const rules = [rule('Bar Centrale', 'cibo'), rule('Amazon', 'regali')]
    expect(categoryFor('BAR CENTRALE SNC', rules)).toBe('cibo')
    expect(categoryFor('Amazon', rules)).toBe('regali')
  })
})

describe('sameMerchant', () => {
  const tx = (id: string, merchant: string, extra: Partial<Tx> = {}): Tx => ({
    id, type: 'uscita', cents: 100, date: '2026-10-01', accountId: 'a', merchant, who: 'jack', category: 'altro', ...extra,
  })
  const txs = [
    tx('1', 'Bar Centrale', { review: true }),
    tx('2', 'BAR CENTRALE snc', { category: 'divertimento' }),
    tx('3', 'Bar Centrale', { category: 'cibo' }),
    tx('4', 'Bar Sport'),
    tx('5', 'Bar Centrale', { type: 'entrata' }),
  ]

  it('trova le uscite dello stesso esercente da correggere', () => {
    expect(sameMerchant(txs, 'Bar Centrale', 'cibo').map((t) => t.id)).toEqual(['1', '2'])
  })

  it('salta il movimento che si sta salvando', () => {
    expect(sameMerchant(txs, 'Bar Centrale', 'cibo', '1').map((t) => t.id)).toEqual(['2'])
  })
})
