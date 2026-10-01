import { useState } from 'react'
import type { View } from '../data/model'

const VIEW_KEY = 'nami-vista'

/** La vista scelta (Jack / Fiore / Coppia) resta quella anche cambiando pagina. */
export function useView(): [View, (v: View) => void] {
  const [view, setViewState] = useState<View>(() => {
    const saved = sessionStorage.getItem(VIEW_KEY)
    return saved === 'jack' || saved === 'fiore' ? saved : 'coppia'
  })
  const setView = (v: View) => {
    sessionStorage.setItem(VIEW_KEY, v)
    setViewState(v)
  }
  return [view, setView]
}
