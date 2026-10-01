// Notifiche push: iscrizione di questo dispositivo.
import { supabase } from './supabase'

// Chiave pubblica: non è un segreto. Quella privata sta solo nei segreti di Supabase.
const VAPID_PUBLIC_KEY = 'BEQQIeZvvKr2_VavnQYzuaPJvzCy7AoVd5BLNH_cR7vvmWKTzRfFfBUr-x3k1qEeerPeHKWQkKQ1HJEsRDGmAx4'

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on'

/** Su iPhone le notifiche esistono solo se l'app è aggiunta alla schermata Home. */
export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const raw = atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const sub = await (await registration()).pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

/** Chiede il permesso (deve partire da un tocco) e iscrive il dispositivo. */
export async function enablePush(householdId: string): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permesso negato: puoi cambiarlo da Impostazioni dell’iPhone → NAMI → Notifiche.')
  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('Iscrizione incompleta: riprova.')
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, household_id: householdId, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' })
  if (error) throw error
}

/** Indirizzo di notifica di questo dispositivo, se è iscritto. */
export async function currentEndpoint(): Promise<string | null> {
  if (!pushSupported()) return null
  return (await (await registration()).pushManager.getSubscription())?.endpoint ?? null
}

export async function disablePush(): Promise<void> {
  const sub = await (await registration()).pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Mostra subito una notifica su questo dispositivo, senza passare dal server. Non fa nulla se il permesso non c'è. */
export async function showLocal(title: string, body: string, url = './#/statistiche'): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return
  await (await registration()).showNotification(title, { body, icon: 'icon-192.png', data: { url } })
}

export const showLocalTest = () => showLocal('NAMI', 'Così appariranno gli avvisi delle spese fisse.', './#/spese-fisse')
