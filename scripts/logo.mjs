// Trasforma l'immagine del logo (simbolo blu su sfondo nero) in un tracciato vettoriale
// e genera src/components/logo.ts. Uso: node scripts/logo.mjs <immagine>
import { writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import potrace from 'potrace'
import sharp from 'sharp'

const input = process.argv[2]
if (!input) throw new Error('Indica il file del logo: node scripts/logo.mjs immagine.jpg')

// Il simbolo è blu, lo sfondo nero: basta il canale blu. Potrace traccia le zone scure, quindi si inverte.
const { data, info } = await sharp(input).extractChannel(2).threshold(80).negate().png().toBuffer({ resolveWithObject: true })

const trace = promisify(potrace.trace)
const traced = await trace(data, { turdSize: 30, optTolerance: 0.4, alphaMax: 1, blackOnWhite: true, threshold: 128 })
const path = /<path[^>]* d="([^"]+)"/.exec(traced)?.[1]
if (!path) throw new Error('Tracciato non trovato')

writeFileSync(
  'src/components/logo.ts',
  `// Generato da scripts/logo.mjs: non modificare a mano.
/** Contorno del simbolo di NAMI (area di disegno ${info.width}×${info.height}). */
export const LOGO_PATH =
  '${path}'
export const LOGO_WIDTH = ${info.width}
export const LOGO_HEIGHT = ${info.height}
`,
)
console.log(`${info.width}x${info.height}, tracciato di ${path.length} caratteri`)

// Icona dell'app: campo blu, simbolo bianco al centro (alto circa il 62% del lato).
const SIZE = 512
const scale = (SIZE * 0.62) / info.height
const x = ((SIZE - info.width * scale) / 2).toFixed(2)
const y = ((SIZE - info.height * scale) / 2).toFixed(2)
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="#2B50E0"/>
  <path transform="translate(${x} ${y}) scale(${scale.toFixed(5)})" fill="#FFFFFF" fill-rule="evenodd" d="${path}"/>
</svg>
`,
)
console.log('public/favicon.svg')
