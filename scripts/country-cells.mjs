// Turns the pixel-art country SVGs (public/countries/*.svg, public/splash/*.svg:
// one path per cell, squares or dots on a regular grid) into their grid cells,
// for the splash to draw in its own style (Splash.vue's basics countries).
// Run: node scripts/country-cells.mjs  →  app/data/countryCells.json
// { [name]: { cols, rows, cells: [col, row][] } }
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'

const sources = ['public/countries', 'public/splash']
const skip = new Set(['wolrd'])
const out = {}

for (const dir of sources) {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg')).sort()) {
    const plain = basename(file, '.svg').toLowerCase().replace(/\s+/g, '-')
    if (skip.has(plain)) continue
    // The first splash's dotted ones (public/splash) kept apart when a newer
    // file has the same name: "<name>-dots".
    const name = out[plain] ? `${plain}-dots` : plain
    const svg = readFileSync(join(dir, file), 'utf8')
    // Each cell's path starts at one of its corners (a square) or its rightmost
    // point (a dot): the same offset for every cell of a file.
    const points = [...svg.matchAll(/<path[^>]*\sd="M\s*([-\d.]+)[ ,]([-\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
    if (points.length < 1) continue
    const step = gridStep(points)
    const minX = Math.min(...points.map((p) => p[0]))
    const minY = Math.min(...points.map((p) => p[1]))
    const seen = new Set()
    const cells = []
    for (const [x, y] of points) {
      const c = Math.round((x - minX) / step)
      const r = Math.round((y - minY) / step)
      const key = `${c},${r}`
      if (seen.has(key)) continue
      seen.add(key)
      cells.push([c, r])
    }
    out[name] = {
      cols: Math.max(...cells.map((cell) => cell[0])) + 1,
      rows: Math.max(...cells.map((cell) => cell[1])) + 1,
      cells,
    }
  }
}

// The grid's step: the median distance from each cell to its nearest
// neighbour (robust to a grid drawn very slightly turned, as the first
// splash's files are).
function gridStep(points) {
  if (points.length < 2) return 7.69
  const nearest = points.map((p, i) => {
    let best = Infinity
    for (let j = 0; j < points.length; j++) {
      if (j === i) continue
      const d = Math.hypot(points[j][0] - p[0], points[j][1] - p[1])
      if (d > 2 && d < best) best = d
    }
    return best
  }).filter(Number.isFinite).sort((a, b) => a - b)
  return nearest[Math.floor(nearest.length / 2)] || 7.69
}

mkdirSync('app/data', { recursive: true })
writeFileSync('app/data/countryCells.json', JSON.stringify(out))
console.log(Object.keys(out).length, 'shapes:', Object.entries(out).map(([k, v]) => `${k}(${v.cells.length})`).join(' '))
