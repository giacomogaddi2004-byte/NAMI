// Funzione del server: ogni mattina alle 8 (ora di Roma) avvisa chi ha spese fisse in scadenza.
// Il server conosce solo il giorno di scadenza (il resto è cifrato), quindi il testo è generico:
// "Oggi scadono 2 spese fisse". I dettagli si vedono aprendo l'app.
//
// Segreti da impostare (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY le mette Supabase da solo e non escono mai da qui.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const ROME = 'Europe/Rome'
const SEND_AT_HOUR = 8

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})
webpush.setVapidDetails('https://giacomogaddi2004-byte.github.io/NAMI/', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

function romeNow(): { date: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: ROME, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function notify(householdId: string, payload: { title: string; body: string }) {
  const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('household_id', householdId)
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 })
      sent++
    } catch (e) {
      // Dispositivo non più valido (app rimossa, permesso tolto): lo dimentichiamo.
      if (e?.statusCode === 404 || e?.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      else console.error('Invio fallito', e?.statusCode ?? e)
    }
  }
  return sent
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'Non autorizzato' }, 401)
  const body = await req.json().catch(() => ({}))

  // Prova: manda subito una notifica a tutti i dispositivi iscritti.
  if (body.test) {
    const { data: households } = await supabase.from('push_subscriptions').select('household_id')
    let sent = 0
    for (const id of new Set((households ?? []).map((h) => h.household_id))) {
      sent += await notify(id, { title: 'NAMI', body: 'Le notifiche funzionano.' })
    }
    return json({ test: true, sent })
  }

  const { date, hour } = romeNow()
  if (hour !== SEND_AT_HOUR) return json({ skipped: `ore ${hour} a Roma, si invia alle ${SEND_AT_HOUR}` })

  // Un solo invio al giorno, anche se la funzione viene chiamata più volte.
  const { error: already } = await supabase.from('push_runs').insert({ run_date: date })
  if (already) return json({ skipped: 'già inviato oggi' })

  const day = Number(date.slice(8))
  const lastDay = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate()
  // Nell'ultimo giorno del mese scadono anche le spese del 29, 30 o 31 che quel mese non esistono.
  const { data: due } = await supabase
    .from('recurrences')
    .select('household_id')
    .is('deleted_at', null)
    .or(day === lastDay ? `day.gte.${day}` : `day.eq.${day}`)

  const perHousehold = new Map<string, number>()
  for (const r of due ?? []) perHousehold.set(r.household_id, (perHousehold.get(r.household_id) ?? 0) + 1)

  let sent = 0
  for (const [householdId, n] of perHousehold) {
    sent += await notify(householdId, {
      title: 'Spese fisse in scadenza',
      body: n === 1 ? 'Oggi scade 1 spesa fissa.' : `Oggi scadono ${n} spese fisse.`,
    })
  }
  return json({ date, households: perHousehold.size, sent })
})
