import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_EVERY_MS = 60 * 60 * 1000

/** Avviso "nuova versione": l'aggiornamento parte solo quando lo tocchi, così non perdi quello che stai scrivendo. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Controlla gli aggiornamenti anche quando l'app torna in primo piano, non solo all'apertura.
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void registration.update())
      setInterval(() => void registration.update(), CHECK_EVERY_MS)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span>È disponibile una nuova versione di NAMI.</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>Aggiorna</button>
    </div>
  )
}
