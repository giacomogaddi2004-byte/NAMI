import { LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH } from './logo'

/** Il simbolo di NAMI, del colore del testo che lo circonda. `height` in pixel. */
export function LogoMark({ height }: { height: number }) {
  return (
    <svg
      width={(height * LOGO_WIDTH) / LOGO_HEIGHT}
      height={height}
      viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
    >
      <path d={LOGO_PATH} />
    </svg>
  )
}
