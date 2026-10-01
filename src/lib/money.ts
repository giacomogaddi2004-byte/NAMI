// Il denaro è sempre in centesimi interi. Qui solo la conversione in testo.

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
