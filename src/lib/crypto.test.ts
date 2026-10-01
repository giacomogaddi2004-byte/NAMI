import { describe, expect, it } from 'vitest'
import {
  decryptJson,
  encryptJson,
  generateHouseholdKey,
  generateInviteCode,
  generateRecoveryCode,
  importHouseholdKey,
  inviteLookup,
  normalizeCode,
  unwrapWithInviteCode,
  unwrapWithPassphrase,
  unwrapWithRecoveryCode,
  wrapWithInviteCode,
  wrapWithPassphrase,
  wrapWithRecoveryCode,
  WrongSecretError,
} from './crypto'

describe('chiave di coppia avvolta', () => {
  it('si sblocca con la frase segreta giusta', async () => {
    const raw = generateHouseholdKey()
    const wrapped = await wrapWithPassphrase(raw, 'onda lunga sul mare calmo')
    expect(wrapped.kdf).toBe('argon2id')
    expect(await unwrapWithPassphrase(wrapped, 'onda lunga sul mare calmo')).toEqual(raw)
  })

  it('non si sblocca con la frase sbagliata', async () => {
    const wrapped = await wrapWithPassphrase(generateHouseholdKey(), 'frase giusta')
    await expect(unwrapWithPassphrase(wrapped, 'frase sbagliata')).rejects.toBeInstanceOf(WrongSecretError)
  })

  it('usa un sale diverso ogni volta', async () => {
    const raw = generateHouseholdKey()
    const a = await wrapWithRecoveryCode(raw, 'AAAA-BBBB')
    const b = await wrapWithRecoveryCode(raw, 'AAAA-BBBB')
    expect(a.salt).not.toBe(b.salt)
    expect(a.ct).not.toBe(b.ct)
  })

  it('si sblocca con il kit di recupero, anche scritto in minuscolo e senza trattini', async () => {
    const raw = generateHouseholdKey()
    const code = generateRecoveryCode()
    const wrapped = await wrapWithRecoveryCode(raw, code)
    expect(await unwrapWithRecoveryCode(wrapped, code.toLowerCase().replace(/-/g, ' '))).toEqual(raw)
    await expect(unwrapWithRecoveryCode(wrapped, generateRecoveryCode())).rejects.toBeInstanceOf(WrongSecretError)
  })

  it('consegna la stessa chiave al partner tramite il codice d’invito', async () => {
    const raw = generateHouseholdKey()
    const code = generateInviteCode()
    const invite = await wrapWithInviteCode(raw, code)
    const received = await unwrapWithInviteCode(invite, code)
    const partner = await wrapWithPassphrase(received, 'la frase del partner')
    expect(await unwrapWithPassphrase(partner, 'la frase del partner')).toEqual(raw)
  })
})

describe('codici', () => {
  it('il kit di recupero ha 8 gruppi da 4 caratteri', () => {
    expect(generateRecoveryCode()).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/)
  })

  it('il codice d’invito ha 4 gruppi da 4 caratteri e una parte pubblica di 6', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/)
    expect(inviteLookup(code)).toBe(code.replace(/-/g, '').slice(0, 6))
  })

  it('corregge le lettere ambigue', () => {
    expect(normalizeCode('o1il-ab')).toBe('0111AB')
  })
})

describe('cifratura dei dati', () => {
  it('cifra e decifra un movimento', async () => {
    const key = await importHouseholdKey(generateHouseholdKey())
    const tx = { cents: -4280, merchant: 'Esselunga', note: 'spesa della settimana' }
    const payload = await encryptJson(key, tx, 'transactions:1')
    expect(payload).not.toContain('Esselunga')
    expect(await decryptJson(key, payload, 'transactions:1')).toEqual(tx)
  })

  it('la chiave importata non è estraibile', async () => {
    const key = await importHouseholdKey(generateHouseholdKey())
    expect(key.extractable).toBe(false)
  })

  it('rifiuta un dato spostato su un’altra riga', async () => {
    const key = await importHouseholdKey(generateHouseholdKey())
    const payload = await encryptJson(key, { cents: 100 }, 'transactions:1')
    await expect(decryptJson(key, payload, 'transactions:2')).rejects.toThrow()
  })

  it('rifiuta un dato cifrato con un’altra chiave', async () => {
    const a = await importHouseholdKey(generateHouseholdKey())
    const b = await importHouseholdKey(generateHouseholdKey())
    const payload = await encryptJson(a, { cents: 100 }, 'x')
    await expect(decryptJson(b, payload, 'x')).rejects.toThrow()
  })
})
