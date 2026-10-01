import type { User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { importHouseholdKey, type WrappedKey } from '../lib/crypto'
import { clearLocalData } from '../data/db'
import { clearKeys, loadKey, saveKey } from '../lib/keyStore'
import { errorMessage, supabase } from '../lib/supabase'

/**
 * signedOut   → nessun accesso
 * noHousehold → accesso fatto, ma non fa ancora parte di una coppia
 * locked      → fa parte di una coppia, ma su questo dispositivo manca la chiave
 * ready       → chiave disponibile: l'app si apre
 */
export type Status = 'loading' | 'signedOut' | 'noHousehold' | 'locked' | 'ready'

export interface Member {
  household_id: string
  wrapped_key: WrappedKey
  recovery_key: WrappedKey
}

interface Session {
  status: Status
  user: User | null
  member: Member | null
  key: CryptoKey | null
  householdId: string | null
  error: string | null
  retry: () => void
  /** Salva sul dispositivo la chiave appena sbloccata e apre l'app. */
  unlock: (raw: Uint8Array<ArrayBuffer>, householdId: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<Session | null>(null)

/** Solo durante lo sviluppo: `?demo` apre l'app senza account e senza rete, con una chiave usa e getta. */
export const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')

export async function fetchMember(userId: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('household_id, wrapped_key, recovery_key')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Member | null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [status, setStatus] = useState<Status>('loading')
  const [member, setMember] = useState<Member | null>(null)
  const [key, setKey] = useState<CryptoKey | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (DEMO) {
      void importHouseholdKey(crypto.getRandomValues(new Uint8Array(32))).then((k) => {
        setKey(k)
        setHouseholdId('demo')
        setStatus('ready')
      })
      return
    }
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = user?.id
  useEffect(() => {
    if (DEMO || user === undefined) return
    if (!userId) {
      setKey(null)
      setMember(null)
      setStatus('signedOut')
      return
    }
    let cancelled = false
    ;(async () => {
      setError(null)
      // Se la chiave è già su questo dispositivo l'app si apre anche senza rete.
      const local = await loadKey(userId)
      if (cancelled) return
      if (local) {
        setKey(local.key)
        setHouseholdId(local.householdId)
        setStatus('ready')
        return
      }
      setStatus('loading')
      try {
        const m = await fetchMember(userId)
        if (cancelled) return
        setMember(m)
        setStatus(m ? 'locked' : 'noHousehold')
      } catch (e) {
        if (!cancelled) setError(errorMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user === undefined, userId, attempt])

  const unlock = useCallback(
    async (raw: Uint8Array<ArrayBuffer>, householdId: string) => {
      if (!userId) return
      const k = await importHouseholdKey(raw)
      await saveKey({ userId, householdId, key: k })
      setKey(k)
      setHouseholdId(householdId)
      setStatus('ready')
    },
    [userId],
  )

  const signOut = useCallback(async () => {
    await clearKeys()
    await clearLocalData()
    await supabase.auth.signOut()
  }, [])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return (
    <Ctx.Provider value={{ status, user: DEMO ? ({ id: 'demo', email: 'demo@nami.test' } as User) : (user ?? null), member, key, householdId, error, retry, unlock, signOut }}>{children}</Ctx.Provider>
  )
}

export function useSession(): Session {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession fuori da SessionProvider')
  return ctx
}
