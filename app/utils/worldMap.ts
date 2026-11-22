// basics,world (22 Nov 2026): the pixel world in the map lab's projections
// (utils/silverMap.ts): the screen cut into cells (`cell` px), each one's
// centre taken back through the projection to the map lab's real world (its
// country, its Blue Marble luminance), and drawn as a mark in its country's
// look and colours (worldGlobe.ts: worldShapes, drawWorldMark). The map lab's
// compositions on it: some countries (fragments), some of the grid's cells, a
// split (the sea's cells left of a line, the land's right), the grain (cells
// kept as the land is dark), filled or only its edges, borders and coasts as
// rings, the latitude and longitude lines as faint dots.
import { SILVER_MAP_DEFAULTS, inverter, pickCells, pickCountries, type Rect, type SilverMapConfig, type SilverMapData } from '~/utils/silverMap'
import { drawWorldMark, worldColor, worldShown, type MapProjection, type WorldSettings, type WorldShape } from '~/utils/worldGlobe'

const RAD = Math.PI / 180

function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** The map lab's config, for its pickers, from these settings. */
function asConfig(s: WorldSettings): SilverMapConfig {
  return { ...SILVER_MAP_DEFAULTS, projection: s.projection as MapProjection, lon: s.lon, lat: s.lat, zoom: s.zoom, rotate: s.roll, countries: s.countries, count: s.count, cellShare: s.cellShare, seed: s.seed, nearTitle: 0 }
}

export interface WorldMapFrame {
  ctx: CanvasRenderingContext2D
  data: SilverMapData
  s: WorldSettings
  /** The view's centre longitude now (lon, turned). */
  lon: number
  /** The canvas's size (CSS px). */
  width: number
  height: number
  /** The grid's box and cells, in the canvas's px. */
  grid: { top: number, left: number, right: number, bottom: number, cols?: number, rows?: number }
  /** The shapes' clock (s, at their pace: their coming and going). */
  t: number
  /** Seconds since the start, in real time (fill 'lines': its fillings). */
  clock: number
  /** How far it has come in (0 to 1): faded in as a whole (by the caller);
   *  here only holding its fillings back until it's all in. */
  reveal: number
  shapes: WorldShape[]
  rgb: [number, number, number][]
  /** The lines' colour (graticule, the others' outlines, the sea in split). */
  ink: [number, number, number]
}

// The countries picked (composition 'countries'), kept until what decides them
// changes: picking them on every frame as the map turns would reshuffle them.
let pickedKey = ''
let picked: Set<number> | null = null

/**
 * fill 'lines', fillPulse: how filled it is now (0 to 1). About every
 * `fillEvery` s (each time at its own moment in its period, by the seed), it
 * fills over FILL_RAMP s, stays `fillHold` s, and empties again.
 */
const FILL_RAMP = 2
export function fillAmount(s: WorldSettings, clock: number) {
  if (s.fill !== 'lines' || !s.fillPulse) return 0
  const every = Math.max(s.fillEvery, s.fillHold + 2 * FILL_RAMP + 1)
  const k = Math.floor(clock / every)
  const start = hash(k, 17, s.seed) * (every - s.fillHold - 2 * FILL_RAMP)
  const local = clock - k * every - start
  const up = Math.min(1, Math.max(0, local / FILL_RAMP))
  const down = Math.min(1, Math.max(0, (FILL_RAMP * 2 + s.fillHold - local) / FILL_RAMP))
  const e = Math.min(up, down)
  return e * e * (3 - 2 * e)
}

// The first pass's result, for as long as what it depends on stays the same.
let pass: { key: string, ids: Int16Array, dark: Float32Array, depth: Float32Array, grat: Uint8Array, lonOf: Float32Array, latOf: Float32Array } = { key: '', ids: new Int16Array(0), dark: new Float32Array(0), depth: new Float32Array(0), grat: new Uint8Array(0), lonOf: new Float32Array(0), latOf: new Float32Array(0) }

export function drawWorldMap(f: WorldMapFrame) {
  const { ctx, data, s, width, height, grid, t, shapes, rgb, ink } = f
  const gw = grid.right - grid.left
  const gh = grid.bottom - grid.top
  const scale = s.zoom * Math.min(gw, gh)
  // Centred on the grid, moved by x, y (in the grid's width, height).
  const cx = grid.left + gw / 2 + (s.x / 100) * gw
  const cy = grid.top + gh / 2 + (s.y / 100) * gh
  const rot = s.roll * RAD
  const cr = Math.cos(rot)
  const sr = Math.sin(rot)
  const step = Math.max(3, s.cell)
  const box = s.inGrid ? { left: grid.left, top: grid.top, right: grid.right, bottom: grid.bottom } : { left: 0, top: 0, right: width, bottom: height }
  // Cells on a lattice through the grid's top left, so they sit on its lines.
  const x0 = grid.left - Math.ceil((grid.left - box.left) / step) * step
  const y0 = grid.top - Math.ceil((grid.top - box.top) / step) * step
  const cols = Math.max(0, Math.floor((box.right - x0) / step))
  const rows = Math.max(0, Math.floor((box.bottom - y0) / step))
  if (!cols || !rows) return

  // First pass: each cell's country (-1: off the projection, 0: sea), its
  // land's darkness, its place on the globe (orthographic: for the rim).
  const n = cols * rows
  const degPerCell = step / (scale * RAD)
  const ortho = s.projection === 'orthographic'
  // (The turning centre taken in steps of a quarter cell: the cells only
  // change land for sea about twice a second, so this pass, the costly one,
  // is kept until then rather than redone every frame. Performance,
  // 22 Nov 2026: the splash's main thread was half busy with it.)
  const lonStep = degPerCell / 4
  const lonUsed = Math.round(f.lon / lonStep) * lonStep
  const key = [s.projection, lonUsed, s.lat, s.zoom, s.roll, s.x, s.y, step, s.graticule, s.inGrid, width, height, grid.left, grid.top, grid.right, grid.bottom].join('|')
  if (pass.key !== key) {
  const invert = inverter({ projection: s.projection as MapProjection, lon: lonUsed, lat: s.lat })
  const ids = new Int16Array(n).fill(-1)
  const dark = new Float32Array(n)
  const depth = new Float32Array(n).fill(1)
  const grat = new Uint8Array(n)
  const lonOf = new Float32Array(n)
  const latOf = new Float32Array(n)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = x0 + (c + 0.5) * step
      const py = y0 + (r + 0.5) * step
      const dx = (px - cx) / scale
      const dy = (cy - py) / scale
      const ux = dx * cr + dy * sr
      const uy = -dx * sr + dy * cr
      const ll = invert(ux, uy)
      if (!ll) continue
      const i = r * cols + c
      let lon = ll[0]
      const lat = ll[1]
      lon = ((lon + 540) % 360) - 180
      if (ortho) depth[i] = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy))
      lonOf[i] = lon
      latOf[i] = lat
      let id = 0
      for (const tile of data.tiles) {
        const u = (lon - tile.west) * tile.ppd
        const v = (tile.north - lat) * tile.ppd
        if (u >= 0 && v >= 0 && u < tile.width - 1 && v < tile.height - 1) {
          const k = Math.round(v) * tile.width + Math.round(u)
          id = tile.ids[k]!
          dark[i] = 1 - tile.lum[k]! / 255
          break
        }
      }
      ids[i] = id
      if (s.graticule > 0) {
        const g = s.graticule
        const near = (a: number) => Math.abs(a - Math.round(a / g) * g)
        if (near(lat) < degPerCell * 0.5 || near(lon) < (degPerCell * 0.5) / Math.max(0.05, Math.cos(lat * RAD))) grat[i] = 1
      }
    }
  }
  pass = { key, ids, dark, depth, grat, lonOf, latOf }
  }
  const { ids, dark, depth, grat, lonOf, latOf } = pass

  // Composition: the countries, the grid's cells.
  if (s.composition === 'countries') {
    const key = JSON.stringify([s.countries, s.count, s.seed, s.projection, s.lat, s.zoom, Math.round(f.lon), cols, rows])
    if (key !== pickedKey || !picked) {
      const where = new Map<string, { count: number, x: number, y: number }>()
      const area = step * step
      for (let i = 0; i < n; i++) {
        const id = ids[i]!
        if (id <= 0) continue
        const name = data.names[id - 1]!
        const at = where.get(name) ?? { count: 0, x: 0, y: 0 }
        at.count += area
        where.set(name, at)
      }
      picked = pickCountries(data, asConfig(s), where, undefined, width, height)
      pickedKey = key
    }
  }
  let shownCells: Rect[] | null = null
  if (s.composition === 'cells' && grid.cols && grid.rows) {
    const cw = gw / grid.cols
    const ch = gh / grid.rows
    const all: Rect[] = []
    for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) all.push({ x: grid.left + c * cw, y: grid.top + r * ch, w: cw, h: ch })
    shownCells = pickCells(all, asConfig(s))
  }
  const splitX = box.left + s.split * (box.right - box.left)
  // (No filling until it has all come in: one thing at a time.)
  const filling = f.reveal < 1 ? 0 : fillAmount(s, f.clock)
  const share = shapes.map((shape) => worldShown(shape, t, s.shown))
  const inkColor = (alpha: number) => `rgba(${ink[0]},${ink[1]},${ink[2]},${alpha})`

  // Second pass: the marks.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      const id = ids[i]!
      if (id < 0) continue
      const sx = x0 + (c + 0.5) * step
      const sy = y0 + (r + 0.5) * step
      if (shownCells && !shownCells.some((q) => sx >= q.x && sx < q.x + q.w && sy >= q.y && sy < q.y + q.h)) continue
      const rim = 1 - s.rim + s.rim * depth[i]!
      const size = ortho ? 0.45 + 0.55 * rim : 1
      const right = c + 1 < cols ? ids[i + 1]! : id
      const down = r + 1 < rows ? ids[i + cols]! : id
      const left = c > 0 ? ids[i - 1]! : id
      const up = r > 0 ? ids[i - cols]! : id
      const neighbours = [right, down, left, up]
      const coastHere = neighbours.some((o) => o >= 0 && (o > 0) !== (id > 0))
      const borderHere = id > 0 && neighbours.some((o) => o > 0 && o !== id)
      const splitSea = s.composition === 'split' && sx < splitX

      // The sea: the latitude and longitude lines; in split, left of the
      // line, the sea's cells instead of the land's.
      if (id === 0 || splitSea) {
        if (splitSea && id === 0) {
          const h = hash(c, r, s.seed)
          if (h < s.shown || s.shown >= 1) drawWorldMark(ctx, 'dots', sx, sy, step, size, s, inkColor(s.alpha * 0.55 * rim), 0.28, 0.5)
        }
        else if (grat[i] && id === 0) {
          drawWorldMark(ctx, 'dots', sx, sy, step, size * 0.6, s, inkColor(0.35 * rim), 0.2, 0.5)
        }
        if (id === 0 || splitSea) continue
      }

      const shape = shapes[(id - 1) % shapes.length]!
      const isPicked = !picked || s.composition !== 'countries' || picked.has(id)
      let look = shape.look
      let alpha = s.alpha * shape.alpha * rim
      if (!isPicked) {
        if (s.others === 'hidden') continue
        if (s.others === 'outline') {
          if (!coastHere && !borderHere) continue
          if ((c + r) % 3 === 0) continue
          drawWorldMark(ctx, 'outline', sx, sy, step, size, s, inkColor(0.5 * rim), 0.28, 0.5)
          continue
        }
        alpha *= 0.25
      }
      // Filled or only the edges; borders and coasts as rings.
      const edge = (s.coast && coastHere) || (s.borders && borderHere)
      if (s.fill === 'lines') {
        const onEdge = coastHere || (s.borders && borderHere)
        // Now and then filled: the land's inside comes in cell by cell, in
        // its own looks, and goes again.
        if (!onEdge && !(filling > 0 && hash(c * 5 + 1, r * 3 + 2, id) < filling)) continue
        if (onEdge) look = 'outline'
      }
      else if (edge) look = 'outline'
      // Its shape coming and going, cell by cell.
      if (hash(c * 7 + 3, r * 13 + 5, id) >= share[(id - 1) % shapes.length]!) continue
      // Grain: kept as the land is dark, its dot as big.
      const d = Math.min(1, Math.max(0, dark[i]! * 1.6))
      if (s.grain > 0 && hash(c, r, s.seed + 1) > 1 - s.grain + s.grain * d) continue
      const mix = 0.5 + 0.5 * Math.sin(lonOf[i]! * 0.9 + latOf[i]! * 0.6 + id)
      drawWorldMark(ctx, look, sx, sy, step, size, s, worldColor(rgb, shape, mix, s.blend, alpha), shape.size, s.grain > 0 ? d : 0.5 + 0.5 * Math.sin(c * 0.9 + r * 0.7))
    }
  }
}
