// Cifratura sul telefono. Una "chiave di coppia" AES-GCM 256 cifra tutti i dati;
// la chiave stessa viaggia solo "avvolta" (wrapped) da un segreto: la frase
// segreta di ciascuno, il kit di recupero oppure il codice di un invito.
import { argon2id } from 'hash-wasm'

/** Parametri Argon2id (memoria in KiB). Salvati accanto alla chiave avvolta. */
const ARGON = { m: 65536, t: 3, p: 1 }
const RECOVERY_INFO = 'nami-recovery-v1'
/** Alfabeto Crockford base32: senza I, L, O, U per non confondersi a mano. */
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** `argon2id` per segreti scelti da una persona, `hkdf` per codici casuali lunghi. */
export type Kdf = 'argon2id' | 'hkdf'

export interface WrappedKey {
  v: 1
  kdf: Kdf
  salt: string
  iv: string
  ct: string
  m?: number
  t?: number
  p?: number
}

export class WrongSecretError extends Error {
  constructor() {
    super('Segreto errato')
  }
}

const text = new TextEncoder()

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n))
}

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

function toBase32(bytes: Uint8Array): string {
  let bits = 0
  let acc = 0
  let out = ''
  for (const b of bytes) {
    acc = (acc << 8) | b
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += BASE32[(acc >> bits) & 31]
    }
  }
  return out
}

function grouped(code: string, size: number): string {
  return code.match(new RegExp(`.{1,${size}}`, 'g'))!.join('-')
}

/** Toglie trattini e spazi e corregge le lettere ambigue (O→0, I/L→1). */
export function normalizeCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
}

/** Kit di recupero: 160 bit casuali, es. "7K2M-…" (8 gruppi da 4). */
export function generateRecoveryCode(): string {
  return grouped(toBase32(randomBytes(20)), 4)
}

/** Codice d'invito: 16 caratteri. I primi 6 servono al server per trovarlo. */
export function generateInviteCode(): string {
  return grouped(toBase32(randomBytes(10)), 4)
}

/** Parte del codice d'invito che il server può conoscere. */
export function inviteLookup(code: string): string {
  return normalizeCode(code).slice(0, 6)
}

/** Nuova chiave di coppia, in forma grezza (32 byte). Non salvarla mai così. */
export function generateHouseholdKey(): Uint8Array<ArrayBuffer> {
  return randomBytes(32)
}

/** Chiave pronta all'uso e non estraibile: è questa che si conserva in IndexedDB. */
export function importHouseholdKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function deriveWrappingKey(secret: string, w: Pick<WrappedKey, 'kdf' | 'salt' | 'm' | 't' | 'p'>): Promise<CryptoKey> {
  const salt = fromBase64(w.salt)
  if (w.kdf === 'hkdf') {
    const base = await crypto.subtle.importKey('raw', text.encode(secret), 'HKDF', false, ['deriveKey'])
    return crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: text.encode(RECOVERY_INFO) },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }
  const hash = await argon2id({
    password: secret,
    salt,
    memorySize: w.m ?? ARGON.m,
    iterations: w.t ?? ARGON.t,
    parallelism: w.p ?? ARGON.p,
    hashLength: 32,
    outputType: 'binary',
  })
  return crypto.subtle.importKey('raw', new Uint8Array(hash), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Protegge la chiave di coppia con un segreto. */
export async function wrapKey(raw: Uint8Array<ArrayBuffer>, secret: string, kdf: Kdf): Promise<WrappedKey> {
  const iv = randomBytes(12)
  const head = { v: 1 as const, kdf, salt: toBase64(randomBytes(16)), ...(kdf === 'argon2id' ? ARGON : {}) }
  const key = await deriveWrappingKey(secret, head)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, raw)
  return { ...head, iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) }
}

/** Recupera la chiave di coppia. Lancia `WrongSecretError` se il segreto non è giusto. */
export async function unwrapKey(wrapped: WrappedKey, secret: string): Promise<Uint8Array<ArrayBuffer>> {
  const key = await deriveWrappingKey(secret, wrapped)
  try {
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(wrapped.iv) }, key, fromBase64(wrapped.ct))
    return new Uint8Array(raw)
  } catch {
    throw new WrongSecretError()
  }
}

/** Frase segreta: scelta da una persona, quindi derivazione lenta (Argon2id). */
export const wrapWithPassphrase = (raw: Uint8Array<ArrayBuffer>, passphrase: string) =>
  wrapKey(raw, passphrase.normalize('NFKC'), 'argon2id')
export const unwrapWithPassphrase = (w: WrappedKey, passphrase: string) => unwrapKey(w, passphrase.normalize('NFKC'))

/** Kit di recupero: già casuale e lungo, basta HKDF. */
export const wrapWithRecoveryCode = (raw: Uint8Array<ArrayBuffer>, code: string) => wrapKey(raw, normalizeCode(code), 'hkdf')
export const unwrapWithRecoveryCode = (w: WrappedKey, code: string) => unwrapKey(w, normalizeCode(code))

/** Invito: codice corto e a scadenza, quindi derivazione lenta. */
export const wrapWithInviteCode = (raw: Uint8Array<ArrayBuffer>, code: string) => wrapKey(raw, normalizeCode(code), 'argon2id')
export const unwrapWithInviteCode = (w: WrappedKey, code: string) => unwrapKey(w, normalizeCode(code))

/**
 * Cifra un dato (importo, esercente, nota…) con la chiave di coppia.
 * `context` lega il testo cifrato alla sua riga (es. "transactions:<id>"),
 * così non può essere spostato su un'altra riga senza che ce ne accorgiamo.
 */
export async function encryptJson(key: CryptoKey, value: unknown, context: string): Promise<string> {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: text.encode(context) },
    key,
    text.encode(JSON.stringify(value)),
  )
  const out = new Uint8Array(12 + ct.byteLength)
  out.set(iv)
  out.set(new Uint8Array(ct), 12)
  return toBase64(out)
}

export async function decryptJson<T>(key: CryptoKey, payload: string, context: string): Promise<T> {
  const bytes = fromBase64(payload)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: text.encode(context) },
    key,
    bytes.subarray(12),
  )
  return JSON.parse(new TextDecoder().decode(plain)) as T
}
