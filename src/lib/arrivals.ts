// Arrivi da Apple Pay: il Comando manda testo grezzo, qui lo interpretiamo.

/**
 * Importo in centesimi (sempre positivo) da testi come "12,90 €", "€12.90", "-3,5", "EUR 1.234,56".
 * - Con virgola e punto insieme, l'ultimo è il separatore dei decimali.
 * - Con un solo tipo di separatore, una volta sola e seguito da tre cifre ("1.234"), sono migliaia.
 * - Altrimenti il separatore è dei decimali.
 * Restituisce null se non è un importo chiaro.
 */
export function parseShortcutAmount(raw: string): number | null {
  const s = raw.replace(/[^\d.,]/g, '')
  if (!/\d/.test(s)) return null

  const sep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  let whole = s
  let fraction = ''
  if (sep >= 0) {
    const after = s.slice(sep + 1)
    const both = s.includes(',') && s.includes('.')
    const count = (s.match(/[.,]/g) ?? []).length
    const decimal = both || (count === 1 && after.length !== 3)
    if (decimal) {
      whole = s.slice(0, sep)
      fraction = after
    }
  }
  whole = whole.replace(/[.,]/g, '')
  if (fraction.length > 2) return null

  const cents = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}

/** Codice segreto personale: 32 byte casuali, in base64url (43 caratteri). */
export function newShortcutToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Impronta SHA-256 in esadecimale: è l'unica cosa del codice che finisce sul server. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
