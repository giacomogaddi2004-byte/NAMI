import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ConfirmOptions {
  confirmLabel?: string
  cancelLabel?: string
  /** Azione che cancella qualcosa: il pulsante diventa rosso. */
  danger?: boolean
}

type Ask = (message: string, options?: ConfirmOptions) => Promise<boolean>

const Ctx = createContext<Ask | null>(null)

interface Pending {
  message: string
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

/** Finestra di conferma con lo stile di NAMI, al posto di quella standard dell'iPhone. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const ask = useCallback<Ask>(
    (message, options = {}) => new Promise<boolean>((resolve) => setPending({ message, options, resolve })),
    [],
  )

  const close = useCallback(
    (value: boolean) => {
      pending?.resolve(value)
      setPending(null)
    },
    [pending],
  )

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, close])

  return (
    <Ctx.Provider value={ask}>
      {children}
      {pending && (
        <div className="dialog-backdrop" onClick={() => close(false)}>
          <div className="dialog" role="alertdialog" aria-modal="true" aria-label={pending.message} onClick={(e) => e.stopPropagation()}>
            <p className="dialog-text">{pending.message}</p>
            <div className="dialog-actions">
              <button type="button" className="dialog-btn" onClick={() => close(false)} autoFocus>
                {pending.options.cancelLabel ?? 'Annulla'}
              </button>
              <button
                type="button"
                className={`dialog-btn dialog-btn--${pending.options.danger ? 'danger' : 'primary'}`}
                onClick={() => close(true)}
              >
                {pending.options.confirmLabel ?? 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useConfirm(): Ask {
  const ask = useContext(Ctx)
  if (!ask) throw new Error('useConfirm fuori da ConfirmProvider')
  return ask
}
