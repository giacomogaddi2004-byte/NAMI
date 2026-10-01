export type CategoryKey =
  | 'supermercato'
  | 'cibo'
  | 'divertimento'
  | 'casa'
  | 'trasporti'
  | 'macchina'
  | 'abbonamenti'
  | 'salute'
  | 'shopping'
  | 'viaggi'
  | 'regali'
  | 'altro'
  | 'lavoro'
  | 'rimborsi'

export interface Category {
  name: string
  color: string
  tint: string
  /** Tracciato SVG dell'icona (viewBox 24×24, solo contorno). */
  icon: string
}

export const CAT: Record<CategoryKey, Category> = {
  supermercato: { name: 'Spesa', color: '#1F9D55', tint: '#E3F6EA', icon: 'M3 4h2l2.4 11h10.2l2-8H6.2M9 20h.01M17 20h.01' },
  cibo: { name: 'Cibo fuori', color: '#D9650A', tint: '#FDEEDC', icon: 'M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 3c-2.5 2.5-2.5 7 0 9v9' },
  divertimento: { name: 'Divertimento', color: '#7C4DDB', tint: '#EFE8FC', icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' },
  casa: { name: 'Casa e bollette', color: '#2B6BE0', tint: '#E3EDFD', icon: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5' },
  trasporti: { name: 'Trasporti', color: '#0E8A7F', tint: '#DDF4F1', icon: 'M7 4h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM5 11h14M8 21l2-4M16 21l-2-4' },
  macchina: { name: 'Macchina', color: '#3F3FB5', tint: '#E7E7F8', icon: 'M5 16v-5l2-5h10l2 5v5M3 16h18M7 19v-3M17 19v-3M5 11h14' },
  abbonamenti: { name: 'Abbonamenti', color: '#C93582', tint: '#FBE5F0', icon: 'M4 12V9a3 3 0 0 1 3-3h13l-3-3M20 12v3a3 3 0 0 1-3 3H4l3 3' },
  salute: { name: 'Salute', color: '#D23434', tint: '#FCE6E6', icon: 'M19.5 12.5L12 20l-7.5-7.5A5 5 0 0 1 12 6a5 5 0 0 1 7.5 6.5z' },
  shopping: { name: 'Shopping', color: '#A86A12', tint: '#FAF0DC', icon: 'M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2' },
  viaggi: { name: 'Viaggi', color: '#0782A0', tint: '#DDF2F8', icon: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z' },
  regali: { name: 'Regali', color: '#B12CC4', tint: '#F7E4FA', icon: 'M4 9h16v4H4zM6 13v8h12v-8M12 9v12M12 9C10 5 6.5 6 7.5 8.5M12 9c2-4 5.5-3 4.5-.5' },
  altro: { name: 'Altro', color: '#5E6578', tint: '#ECEEF3', icon: 'M5 12h.01M12 12h.01M19 12h.01' },
  lavoro: { name: 'Lavoro', color: '#157A43', tint: '#DFF3E7', icon: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16' },
  rimborsi: { name: 'Rimborsi', color: '#157A43', tint: '#DFF3E7', icon: 'M9 14l-4-4 4-4M5 10h9a5 5 0 0 1 0 10h-1' },
}

export const EXPENSE_CATEGORIES: CategoryKey[] = [
  'supermercato', 'cibo', 'divertimento', 'casa', 'trasporti', 'macchina',
  'abbonamenti', 'salute', 'shopping', 'viaggi', 'regali', 'altro',
]

export const INCOME_CATEGORIES: CategoryKey[] = ['lavoro', 'rimborsi', 'altro']
