// Funzione del server: riceve un pagamento dall'automazione dei Comandi dell'iPhone.
//
// Riceve {token, amount, merchant, card} e lo passa a `ingest_arrival` nel database, che controlla il
// codice personale e aggiunge l'arrivo. La funzione usa solo la chiave pubblica: non può leggere né
// cancellare nulla. Importo ed esercente restano testo grezzo: li interpreta l'app.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
// Chiave "publishable": è pubblica per progetto, la stessa che sta nell'app.
const PUBLISHABLE_KEY = 'sb_publishable_rviTUJF5-qr5SuQ-EM34gg_RGPfxFmD'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** Il Comando può mandare numeri o testo: qui diventano sempre testo. */
const text = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string' && typeof value !== 'number') return null
  return String(value).slice(0, max)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Usa POST' }, 405)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return json({ error: 'Corpo non valido: serve un JSON' }, 400)

  const token = text(body.token, 200)
  const amount = text(body.amount, 40)
  const merchant = text(body.merchant, 200)
  const card = text(body.card, 100)
  if (!token || token.length < 20) return json({ error: 'Codice mancante' }, 401)
  if (amount === null || merchant === null || card === null) return json({ error: 'Campi non validi' }, 400)
  if (amount.trim() === '') return json({ error: 'Manca l’importo' }, 400)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ingest_arrival`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token, p_amount: amount, p_merchant: merchant, p_card: card }),
  })
  if (res.ok) return json({ ok: true })

  const err = await res.json().catch(() => ({}))
  // 28000 = codice non valido, 54000 = troppi arrivi
  if (err.code === '28000') return json({ error: 'Codice non valido' }, 401)
  if (err.code === '54000') return json({ error: 'Troppi arrivi, riprova più tardi' }, 429)
  console.error('ingest_arrival', res.status, err)
  return json({ error: 'Errore del server' }, 500)
})
