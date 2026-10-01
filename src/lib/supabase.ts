import { createClient } from '@supabase/supabase-js'

// L'indirizzo e la chiave "publishable" non sono segreti: possono stare nell'app.
// La chiave "secret / service_role" invece non deve MAI comparire qui.
const SUPABASE_URL = 'https://omjgsmwfzyjgxqhbzntf.supabase.co'
const SUPABASE_PUBLISHABLE_KEY: string = 'sb_publishable_rviTUJF5-qr5SuQ-EM34gg_RGPfxFmD'

export const isConfigured = SUPABASE_PUBLISHABLE_KEY !== ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY || 'non-configurata')

/** Traduce i messaggi di errore più comuni di Supabase. */
export function errorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error)
  if (/invalid login credentials/i.test(msg)) return 'Email o password non corrette.'
  if (/already registered/i.test(msg)) return 'Esiste già un account con questa email: scegli "Accedi".'
  if (/signups? (are )?not allowed|signup is disabled/i.test(msg)) return 'Le registrazioni sono chiuse.'
  if (/failed to fetch|network|load failed/i.test(msg)) return 'Connessione assente: riprova quando sei online.'
  if (/notallowederror|not allowed by the user agent|timed out/i.test(msg)) return 'Operazione annullata.'
  return msg
}
