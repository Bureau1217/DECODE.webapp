// Turns the world SVG (public/countries/wolrd.svg: one square per cell, the
// countries laid out on a disc, as a hemisphere seen from the front) into its
// cells, grouped into shapes (cells touching, diagonals included), for
// SplashWorldGlobe.vue to put on a turning sphere.
// Run: node scripts/world-cells.mjs  →  app/data/worldCells.json
// { radius, cells: [x, y, shape][] }: x, y from the disc's centre, in cells
// (the disc's radius `radius`), shape the index of the shape the cell is in.
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync('public/countries/wolrd.svg', 'utf8')
const points = [...svg.matchAll(/<path[^>]*\sd="M\s*([-\d.]+)[ ,]([-\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
const step = 7.69
const minX = Math.min(...points.map((p) => p[0]))
const minY = Math.min(...points.map((p) => p[1]))
const grid = new Map()
for (const [x, y] of points) {
  const c = Math.round((x - minX) / step)
  const r = Math.round((y - minY) / step)
  grid.set(`${c},${r}`, [c, r])
}
const cells = [...grid.values()]

// The disc: the centre of the smallest circle round all the cells (roughly:
// the middle of their extent), its radius the farthest cell, a cell more.
const cx = (Math.min(...cells.map((p) => p[0])) + Math.max(...cells.map((p) => p[0]))) / 2
const cy = (Math.min(...cells.map((p) => p[1])) + Math.max(...cells.map((p) => p[1]))) / 2
const radius = Math.max(...cells.map(([c, r]) => Math.hypot(c - cx, r - cy))) + 1

// Shapes: flood fill over the 8 neighbours.
const shapeOf = new Map()
let shapes = 0
for (const [c, r] of cells) {
  const key = `${c},${r}`
  if (shapeOf.has(key)) continue
  const stack = [[c, r]]
  shapeOf.set(key, shapes)
  while (stack.length) {
    const [x, y] = stack.pop()
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const k = `${x + dx},${y + dy}`
        if (grid.has(k) && !shapeOf.has(k)) {
          shapeOf.set(k, shapes)
          stack.push([x + dx, y + dy])
        }
      }
    }
  }
  shapes++
}

// The big masses (a continent in one piece) cut into regions of about
// REGION cells (k-means on their cells, seeded evenly through them), so they
// come and go as countries would, not a continent at once.
const REGION = 110
const members = new Map()
for (const [c, r] of cells) {
  const s = shapeOf.get(`${c},${r}`)
  if (!members.has(s)) members.set(s, [])
  members.get(s).push([c, r])
}
for (const [s, list] of members) {
  const k = Math.round(list.length / REGION)
  if (k < 2) continue
  const sorted = [...list].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  let centres = Array.from({ length: k }, (_, i) => [...sorted[Math.floor(((i + 0.5) * sorted.length) / k)]])
  let assign = []
  for (let round = 0; round < 25; round++) {
    assign = list.map(([x, y]) => {
      let best = 0
      let bestD = Infinity
      centres.forEach(([u, v], i) => {
        const d = (x - u) ** 2 + (y - v) ** 2
        if (d < bestD) { bestD = d; best = i }
      })
      return best
    })
    centres = centres.map((centre, i) => {
      const mine = list.filter((_, j) => assign[j] === i)
      return mine.length ? [mine.reduce((t, p) => t + p[0], 0) / mine.length, mine.reduce((t, p) => t + p[1], 0) / mine.length] : centre
    })
  }
  list.forEach(([x, y], j) => {
    if (assign[j] > 0) shapeOf.set(`${x},${y}`, shapes + assign[j] - 1)
  })
  shapes += k - 1
}

const out = {
  radius: Math.round(radius * 100) / 100,
  shapes,
  cells: cells.map(([c, r]) => [Math.round((c - cx) * 100) / 100, Math.round((r - cy) * 100) / 100, shapeOf.get(`${c},${r}`)]),
}
writeFileSync('app/data/worldCells.json', JSON.stringify(out))
console.log(`${out.cells.length} cells, ${shapes} shapes, radius ${out.radius}`)
