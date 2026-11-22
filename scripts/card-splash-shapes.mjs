// Adds the splash's two old pixel shapes to app/data/cardCountries.json, for the
// first guide card (group-42, as it sat at the splash's bottom right) and the
// first tool card (ca, as at its top left): their cells' centres (each path's
// points averaged), turned as on the splash, in steps of one cell.
// Run: node scripts/card-splash-shapes.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const SHAPES = [['splash-ca', 'public/splash/ca.svg', 112], ['splash-group-42', 'public/splash/group-42.svg', -54]]
const file = 'app/data/cardCountries.json'
const data = JSON.parse(readFileSync(file, 'utf8'))
for (const [name, src, turn] of SHAPES) {
  const svg = readFileSync(src, 'utf8')
  const centres = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(([, d]) => {
    const n = d.match(/-?\d*\.?\d+/g).map(Number)
    let x = 0, y = 0
    for (let i = 0; i + 1 < n.length; i += 2) { x += n[i]; y += n[i + 1] }
    return [x / (n.length / 2), y / (n.length / 2)]
  })
  // The cell step: the commonest nearest-neighbour distance.
  const near = centres.map(([x, y], i) => Math.min(...centres.filter((_, j) => j !== i).map(([u, v]) => Math.hypot(u - x, v - y))))
  near.sort((a, b) => a - b)
  const step = near[Math.floor(near.length / 2)]
  const a = (turn * Math.PI) / 180
  const turned = centres.map(([x, y]) => [(x * Math.cos(a) - y * Math.sin(a)) / step, (x * Math.sin(a) + y * Math.cos(a)) / step])
  const minX = Math.min(...turned.map((p) => p[0])) - 0.5
  const minY = Math.min(...turned.map((p) => p[1])) - 0.5
  const cells = turned.map(([x, y]) => [+(x - minX - 0.5).toFixed(2), +(y - minY - 0.5).toFixed(2)])
  const cols = Math.ceil(Math.max(...cells.map((p) => p[0])) + 1)
  const rows = Math.ceil(Math.max(...cells.map((p) => p[1])) + 1)
  data[name] = { cols, rows, cells }
  console.log(name, centres.length, 'cells', `${cols}x${rows}`, 'step', step.toFixed(2))
}
writeFileSync(file, JSON.stringify(data))
