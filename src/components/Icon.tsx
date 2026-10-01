import { CAT, type CategoryKey } from '../data/categories'

export const ICONS = {
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  plus: 'M12 5v14M5 12h14',
  piggy:
    'M4 11.5C4 8 7 5.5 11 5.5h2c1 0 2 .2 2.8.6L19 4.5v3.3c.9.8 1.5 1.8 1.8 2.7H22v4h-1.6c-.5 1-1.3 1.9-2.4 2.5V20h-3v-1.5h-5V20H7v-2.6C5.2 16.2 4 14 4 11.5zM15.5 10.5h.01',
  stats: 'M5 20v-8M12 20V5M19 20v-11M3 20h18',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.8-4.8',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  laptop: 'M5 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9H5zM3 18h18M10 15.5h4',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  swap: 'M4 8h15l-3-3M20 16H5l3 3',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
} as const

interface IconProps {
  d: string
  size?: number
  color?: string
  width?: number
}

export function Icon({ d, size = 24, color = 'currentColor', width = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  )
}

interface CatIconProps {
  cat: CategoryKey
  box?: number
  radius?: number
  icon?: number
  /** Sfondo alternativo (es. bianco quando la categoria è selezionata). */
  background?: string
}

export function CatIcon({ cat, box = 42, radius = 14, icon = 22, background }: CatIconProps) {
  const c = CAT[cat]
  return (
    <span
      className="cat-icon"
      style={{ width: box, height: box, borderRadius: radius, background: background ?? c.tint }}
    >
      <Icon d={c.icon} size={icon} color={c.color} />
    </span>
  )
}
