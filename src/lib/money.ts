// Il denaro è sempre in centesimi interi. Qui solo la conversione in testo.

/** Quota degli incassi di lavoro che va al conto tasse. */
export const TAX_PERCENT = 30

/** "1.250,5" → 125050. Restituisce null se il testo non è un importo. */
export function parseEur(text: string): number | null {
  const m = /^(\d+)(?:,(\d{1,2}))?$/.exec(text.trim().replace(/\./g, ''))
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
}

/** Quota per le tasse di un incasso, arrotondata al centesimo. */
export function taxShare(cents: number): number {
  return Math.round((cents * TAX_PERCENT) / 100)
}

/** 123456 → "1.234,56 €" (senza segno). */
export function formatEur(cents: number): string {
  const abs = Math.abs(Math.trunc(cents))
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const dec = (abs % 100).toString().padStart(2, '0')
  return `${euros},${dec} €`
}

/** −4280 → "−42,80 €", 125000 → "+1.250,00 €". */
export function formatSigned(cents: number): string {
  return (cents < 0 ? '−' : '+') + formatEur(cents)
}

/** 160430 → "1.604 €" (euro interi, arrotondati). */
export function formatEurRounded(cents: number): string {
  const euros = Math.round(Math.abs(cents) / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${euros} €`
}
