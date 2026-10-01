// Genera le icone PNG dell'app a partire da public/favicon.svg.
import sharp from 'sharp'

const sizes = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 }

for (const [name, size] of Object.entries(sizes)) {
  await sharp('public/favicon.svg', { density: 300 }).resize(size, size).png().toFile(`public/${name}`)
  console.log(`public/${name}`)
}
