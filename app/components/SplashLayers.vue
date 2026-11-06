<script setup lang="ts">
// The splash's shapes (desktop), in place of the pixel masses, on the grid's own
// cells but placed and moving as those did:
// - two shapes tucked behind the headline's upper corners, along the diagonal (the
//   left one standing above the headline, the right one lower);
// - the coral one between the subtitle and the button, stepping right a little at
//   each change; past the right edge, it comes back in from the left.
// At each headline change, all three turn, cell by cell, into new shapes in step
// with the letters.
// Light: each shape a drifting relief in stepped bands of its tool colour (the
// "relief terraces"), the grid's lines left showing.
// Dark: a fake news clip through each, in the dark mode's negative duotone
// (app.vue's #duotone-dark), outlined in its tool colour; the grid's lines showing.
const props = defineProps<{
  grid: { top: number, left: number, right: number, bottom: number, cols: number, rows: number, cellW: number, cellH: number, boxW: number, boxH: number } | null
  // Bumped at each headline change (Splash.vue's nextHeadline).
  round: number
  // False until the splash has built itself.
  shown: boolean
  dark: boolean
  // The headline's frame, the subtitle and the button, relative to the splash.
  boxes: () => { headline: DOMRect, subtitle: DOMRect | null, cta: DOMRect | null } | null
  // When each letter of each line lands, in ms from the start of a change: one tile
  // of that line's shape changes with each.
  ticks: number[][]
  // The headline's lines: each shape has as many tiles as its line has letters.
  lines: string[]
  videos: string[]
}>()

type Rgb = [number, number, number]
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
// The shapes: the crossing one, then the upper left and the upper right.
const SHAPES = [
  { ramp: ['#ffffff', '#fdebe7', '#fcc6bd', '#fc9c8d', '#fc7c6a', '#e2654f', '#a8432f', '#5e2318'].map(hex), grain: hex('#ec5a3f'), stroke: '#f27362' },
  { ramp: ['#ffffff', '#e8f8f5', '#cdeeea', '#b4eae1', '#6cc4b6', '#3fa396', '#2a7d70', '#143e38'].map(hex), grain: hex('#2f9a8b'), stroke: '#6cc4b6' },
  { ramp: ['#ffffff', '#f3eaf9', '#e4d4f2', '#cdb4ea', '#a888d8', '#8a5fc7', '#64409c', '#352058'].map(hex), grain: hex('#8a5fc7'), stroke: '#b79ae3' },
]
// app.vue's #duotone-dark: black shows light, white shows dark.
const NEGATIVE: [Rgb, Rgb] = [[233, 233, 231], [28, 28, 28]]
const FPS = 24
const BUILD_MS = 1800 // growing out of nothing, as the splash builds
// All of them turn into their next shape in step with the headline's letters
// (Splash.vue's HEADLINE_MORPH_MS).
const MORPH_MS = 1500
const CROSS = { cols: 6, hop: 2 } // the crossing one: its width, its step right
const STRIPE_CHANCE = 0 // of the headline changes, those where a top shape becomes a vertical stripe (off)
const REST_CHANCE = 0.2 // of the headline changes, those where the shapes all go for a round
let resting = false
const TOP = { cols: 4, rows: 3, tuck: 1 } // a top one's box, and how far it tucks behind the headline

const PERM = new Uint8Array(512)
{
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[p[i], p[j]] = [p[j]!, p[i]!]
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]!
}
const grain = (x: number, y: number) => PERM[(PERM[x & 255]! + (y & 255)) & 511]! / 255 + PERM[(PERM[(x + 97) & 255]! + ((y + 31) & 255)) & 511]! / 65025

interface Box { c0: number, r0: number, cols: number, rows: number }
interface Change { key: string, add: boolean, at: number }
interface Shape { cells: Set<string>, changes: Change[], box: Box | null, stripe: number | null }
const shapes: Shape[] = SHAPES.map(() => ({ cells: new Set(), changes: [], box: null, stripe: null }))
let crossLeft = 0

const keyOf = (c: number, r: number) => `${c},${r}`

// Value noise for the relief.
const hash = (x: number, y: number) => PERM[(PERM[x & 255]! + (y & 255)) & 511]! / 255
const smooth = (v: number) => v * v * (3 - 2 * v)
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x: number, y: number) => noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.17


// Where each shape keeps to.
function boxFor(index: number): Box | null {
  const g = props.grid, b = props.boxes()
  if (!g || !b) return null
  const col = (x: number) => Math.floor((x - g.left) / g.cellW)
  const row = (y: number) => Math.floor((y - g.top) / g.cellH)
  if (index === 0) {
    // Between the subtitle and the button.
    const top = b.subtitle ? row(b.subtitle.bottom) : g.rows - 3
    const bottom = b.cta ? row(b.cta.top) : g.rows - 1
    // At least three rows, reaching up behind the subtitle if need be: room to be a
    // shape, not a long band.
    const rows0 = Math.max(1, Math.min(g.rows, bottom + 1) - Math.max(0, top))
    const rows = Math.min(g.rows, Math.max(3, rows0))
    const r0 = Math.max(0, Math.min(g.rows, bottom + 1) - rows)
    return { c0: crossLeft, r0, cols: Math.max(CROSS.cols, Math.ceil(targetFor(0) * 1.4 / rows)), rows }
  }
  const h = b.headline
  // Room for as many tiles as the line has letters, and some to drift in.
  const cols = Math.max(TOP.cols, Math.ceil(targetFor(index) * 1.4 / TOP.rows))
  if (index === 1) {
    // Behind the headline's upper left corner, standing above it.
    const c = col(h.left), r = row(h.top)
    return { c0: c - cols + 1 + TOP.tuck, r0: Math.max(0, r - TOP.rows + 1 + TOP.tuck), cols, rows: TOP.rows }
  }
  // Behind its upper right corner, lower, half above it.
  const c = col(h.right - 1), r = row(h.top)
  return { c0: c - TOP.tuck, r0: Math.max(0, r - 1), cols, rows: TOP.rows }
}

// Line i of the headline drives shape LINE_SHAPE[i % 3]: the first line the upper
// left one, the second the upper right, the third the crossing one.
const LINE_SHAPE = [1, 2, 0]
const lettersOf = (line: string | undefined) => (line ?? '').replace(/\s/g, '').length

const parse = (k: string) => k.split(',').map(Number) as [number, number]
const inBox = (box: Box, c: number, r: number) => c >= box.c0 && r >= box.r0 && c < box.c0 + box.cols && r < box.r0 + box.rows
const neighbours = (c: number, r: number) => [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]] as [number, number][]

// The crossing one's columns are counted round the grid, from just behind it.
function along(c: number) {
  const cols = props.grid?.cols ?? 1
  return ((c - crossLeft + CROSS.hop + 1) % cols + cols) % cols
}
function wrapC(c: number) {
  const cols = props.grid?.cols ?? 1
  return ((c % cols) + cols) % cols
}

// Whether the tiles are all in one piece (the crossing one's columns wrapping).
function connected(index: number, cells: Set<string>) {
  const first = cells.values().next().value
  if (!first) return true
  const seen = new Set([first]), todo = [first]
  while (todo.length) {
    const [c, r] = parse(todo.pop()!)
    for (const [x0, y] of neighbours(c, r)) {
      const k = keyOf(index === 0 ? wrapC(x0) : x0, y)
      if (cells.has(k) && !seen.has(k)) { seen.add(k); todo.push(k) }
    }
  }
  return seen.size === cells.size
}

// One tile to take away: one outside its place (or off its stripe) first, then an
// edge one (the crossing one's back), never one that would split the shape.
function toRemove(index: number, cells: Set<string>, box: Box) {
  const list = [...cells].map(parse)
  const stripe = shapes[index]!.stripe
  const score = ([c, r]: [number, number]) => {
    const keeps = (() => { const rest = new Set(cells); rest.delete(keyOf(c, r)); return connected(index, rest) })()
    const outside = stripe !== null ? c !== stripe : index === 0 ? r < box.r0 || r >= box.r0 + box.rows || along(c) > box.cols + CROSS.hop : !inBox(box, c, r)
    if (!keeps) return -1000 + Math.random()
    const edges = 4 - neighbours(c, r).filter(([x, y]) => cells.has(keyOf(x, y))).length
    return (outside ? 100 : 0) + (index === 0 ? -along(c) * 3 : 0) + edges * 2 + Math.random()
  }
  list.sort((a, b) => score(b) - score(a))
  return list[0] ? keyOf(list[0][0], list[0][1]) : null
}
// One tile to add: beside the shape, inside its place (the crossing one's front);
// anywhere in its place when it has none.
function toAdd(index: number, cells: Set<string>, box: Box) {
  const g = props.grid!
  const stripe = shapes[index]!.stripe
  // A stripe: one column, the grid's whole height.
  const fits = (c: number, r: number) => r >= 0 && r < g.rows && (stripe !== null ? c === stripe : index === 0 ? r >= box.r0 && r < box.r0 + box.rows : c >= 0 && c < g.cols && inBox(box, c, r))
  let options: [number, number][] = []
  for (const k of cells) {
    for (const [c0, r] of neighbours(...parse(k))) {
      const c = index === 0 ? wrapC(c0) : c0
      if (fits(c, r) && !cells.has(keyOf(c, r))) options.push([c, r])
    }
  }
  if (!options.length && stripe !== null) {
    for (let r = box.r0; r < box.r0 + box.rows; r++) if (!cells.has(keyOf(stripe, r))) options.push([stripe, r])
  }
  if (!options.length) {
    for (let r = box.r0; r < box.r0 + box.rows; r++) {
      for (let c = box.c0; c < box.c0 + box.cols; c++) {
        const cc = index === 0 ? wrapC(c) : c
        if (fits(cc, r) && !cells.has(keyOf(cc, r))) options.push([cc, r])
      }
    }
  }
  if (!options.length) return null
  // No filled squares: a tile that would close a 2×2 block comes last.
  const squares = ([c, r]: [number, number]) => [[-1, -1], [0, -1], [-1, 0], [0, 0]].filter(([dx, dy]) =>
    [[0, 0], [1, 0], [0, 1], [1, 1]].every(([ox, oy]) => {
      const x = c + dx! + ox!, y = r + dy! + oy!
      return (x === c && y === r) || cells.has(keyOf(index === 0 ? wrapC(x) : x, y))
    })).length
  // No long lines either: a tile that would make the shape more than twice as long
  // as it is wide (or the reverse) comes late.
  const span = (extra: [number, number]) => {
    const pts = [...[...cells].map(parse), extra]
    const xs = pts.map(([c]) => (index === 0 ? along(c) : c)), ys = pts.map(([, r]) => r)
    const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1
    return Math.max(w, h) / Math.min(w, h)
  }
  const score = (o: [number, number]) => squares(o) * 100 + Math.max(0, span(o) - 2) * 40 + (index === 0 ? -along(o[0]) * 2 : 0) + Math.random() * 3
  options.sort((a, b) => score(a) - score(b))
  const pick = options[0]!
  return keyOf(pick[0], pick[1])
}

// A shape's changes, one per beat: grows or shrinks to `target` tiles, and on the
// other beats one tile moves (one goes, one comes), so it drifts.
function plan(index: number, target: number, beats: number[], now: number) {
  const shape = shapes[index]!, box = shape.box
  if (!box) return
  const cells = new Set(shape.cells)
  // What's already planned lands first.
  for (const change of shape.changes) {
    if (change.add) cells.add(change.key)
    else cells.delete(change.key)
  }
  const changes: Change[] = []
  let size = cells.size
  const n = beats.length
  // Fewer beats than tiles to add or take: several on a beat.
  const grows = target - size
  const perBeat = Math.max(1, Math.ceil(Math.abs(grows) / Math.max(1, n)))
  let left = Math.abs(grows)
  beats.forEach((beat, i) => {
    const at = now + beat
    // Spread the growing or shrinking over the beats, the rest are moves.
    const due = Math.min(left, Math.ceil(Math.abs(grows) * (i + 1) / Math.max(1, n)) - (Math.abs(grows) - left), perBeat)
    if (due > 0) {
      for (let k = 0; k < due; k++) {
        const key = grows > 0 ? toAdd(index, cells, box) : toRemove(index, cells, box)
        if (!key) break
        if (grows > 0) cells.add(key)
        else cells.delete(key)
        changes.push({ key, add: grows > 0, at })
        size += grows > 0 ? 1 : -1
        left--
      }
      return
    }
    if (!size || target === 0) return
    const out = toRemove(index, cells, box)
    if (!out) return
    cells.delete(out)
    const into = toAdd(index, cells, box)
    if (!into || into === out) { cells.add(out); return }
    cells.add(into)
    changes.push({ key: out, add: false, at }, { key: into, add: true, at })
  })
  shape.changes = [...shape.changes, ...changes]
}

function targetFor(index: number) {
  const line = LINE_SHAPE.indexOf(index)
  return line < 0 ? 0 : lettersOf(props.lines[line])
}

function build(now: number) {
  shapes.forEach((shape, index) => {
    shape.box = boxFor(index)
    shape.cells = new Set()
    shape.changes = []
    const target = targetFor(index)
    plan(index, target, Array.from({ length: Math.max(1, target) }, (_, i) => BUILD_MS * (i + 1) / Math.max(1, target)), now)
  })
}

// At each headline change: each letter of a line, as it lands, changes one tile of
// that line's shape. The crossing one also steps right (round the grid's sides).
function onHeadline() {
  const g = props.grid
  if (!g) return
  const now = performance.now()
  crossLeft = (crossLeft + CROSS.hop) % g.cols
  // Now and then (never twice running) they all go for one headline, a tile per
  // letter, and come back with the next.
  resting = !resting && Math.random() < REST_CHANCE
  // Now and then one of the top shapes draws out into a long vertical stripe, on
  // its outer column, for a headline.
  const striped = Math.random() < STRIPE_CHANCE ? 1 + Math.floor(Math.random() * 2) : -1
  shapes.forEach((shape, index) => {
    shape.box = boxFor(index)
    shape.stripe = index === striped && shape.box ? Math.max(0, Math.min(g.cols - 1, index === 1 ? shape.box.c0 : shape.box.c0 + shape.box.cols - 1)) : null
    const line = LINE_SHAPE.indexOf(index)
    const beats = props.ticks[line] ?? []
    plan(index, resting ? 0 : targetFor(index), beats.length ? beats : [MORPH_MS], now)
    shape.changes.sort((a, b) => a.at - b.at)
  })
  // A new clip for each shape at each change, never the same in two shapes.
  clipStart = (clipStart + SHAPES.length) % Math.max(1, props.videos.length)
  playVideos(props.dark)
}
function step(now: number) {
  for (const shape of shapes) {
    while (shape.changes.length && shape.changes[0]!.at <= now) {
      const change = shape.changes.shift()!
      if (change.add) shape.cells.add(change.key)
      else shape.cells.delete(change.key)
    }
  }
}

// One video element per clip. Each shape shows its own clip, never the same as
// another's: clip (shape + clipStart), so with as many clips as shapes they all differ.
const videoEls: HTMLVideoElement[] = []
let clipStart = 0
const clipOf = (shape: number) => (shape + clipStart) % Math.max(1, props.videos.length)
function videoFor(shape: number) {
  const index = clipOf(shape)
  if (!videoEls[index]) {
    const video = document.createElement('video')
    video.src = props.videos[index]!
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'auto'
    videoEls[index] = video
  }
  return videoEls[index]!
}
function playVideos(on: boolean) {
  if (!props.videos.length) return
  const showing = new Set(SHAPES.map((_, i) => clipOf(i)))
  SHAPES.forEach((_, i) => videoFor(i))
  videoEls.forEach((video, index) => {
    if (on && showing.has(index)) video.play().catch(() => {})
    else video.pause()
  })
}

const canvas = ref<HTMLCanvasElement | null>(null)
const frameCanvas = import.meta.client ? document.createElement('canvas') : null
const pixelCanvas = import.meta.client ? document.createElement('canvas') : null

function bounds(cells: Set<string>) {
  const pts = [...cells].map((k) => k.split(',').map(Number) as [number, number])
  const cs = pts.map(([c]) => c), rs = pts.map(([, r]) => r)
  const c0 = Math.min(...cs), r0 = Math.min(...rs)
  return { c0, r0, cols: Math.max(...cs) - c0 + 1, rows: Math.max(...rs) - r0 + 1 }
}

// Dark mode: the shape's clip over its box, in the negative duotone.
function paintClip(ctx: CanvasRenderingContext2D, index: number, cells: Set<string>) {
  const g = props.grid!
  if (!props.videos.length) return
  const video = videoFor(index)
  if (video.readyState < 2) return
  const b = bounds(cells)
  const w = Math.round(b.cols * g.cellW), h = Math.round(b.rows * g.cellH)
  frameCanvas!.width = w; frameCanvas!.height = h
  const fctx = frameCanvas!.getContext('2d', { willReadFrequently: true })!
  const vw = video.videoWidth, vh = video.videoHeight, k = Math.max(w / vw, h / vh)
  fctx.drawImage(video, (w - vw * k) / 2, (h - vh * k) / 2, vw * k, vh * k)
  const d = fctx.getImageData(0, 0, w, h).data
  const img = fctx.createImageData(w, h), o = img.data
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!) / 255
    const c = mix(NEGATIVE[0], NEGATIVE[1], l)
    o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = 255
  }
  pixelCanvas!.width = w; pixelCanvas!.height = h
  pixelCanvas!.getContext('2d')!.putImageData(img, 0, 0)
  for (const key of cells) {
    const [c, r] = key.split(',').map(Number) as [number, number]
    const sx = (c - b.c0) * g.cellW, sy = (r - b.r0) * g.cellH
    // Inside the cell, the grid's lines left showing.
    ctx.drawImage(pixelCanvas!, sx + 1, sy + 1, g.cellW - 1, g.cellH - 1, g.left + c * g.cellW + 1, g.top + r * g.cellH + 1, g.cellW - 1, g.cellH - 1)
  }
  // The shape's outline in its tool colour.
  ctx.strokeStyle = SHAPES[index]!.stroke
  ctx.lineWidth = 2
  ctx.lineCap = 'square'
  ctx.beginPath()
  for (const key of cells) {
    const [c, r] = key.split(',').map(Number) as [number, number]
    const x0 = g.left + c * g.cellW, y0 = g.top + r * g.cellH, x1 = x0 + g.cellW, y1 = y0 + g.cellH
    if (!cells.has(keyOf(c, r - 1))) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0) }
    if (!cells.has(keyOf(c, r + 1))) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1) }
    if (!cells.has(keyOf(c - 1, r))) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1) }
    if (!cells.has(keyOf(c + 1, r))) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1) }
  }
  ctx.stroke()
}

// Light mode: a drifting relief drawn as stepped bands (terraces) in shades of
// the shape's tool colour, dithered, inside each cell's grid lines.
const PIXEL = 2
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const reliefCanvas = import.meta.client ? document.createElement('canvas') : null
function paintRelief(ctx: CanvasRenderingContext2D, index: number, cells: Set<string>, now: number) {
  const g = props.grid!
  const ramp = SHAPES[index]!.ramp
  const pw = Math.ceil(g.cellW / PIXEL), ph = Math.ceil(g.cellH / PIXEL)
  reliefCanvas!.width = pw; reliefCanvas!.height = ph
  const rctx = reliefCanvas!.getContext('2d')!
  const scale = (g.right - g.left) / PIXEL
  const tt = now / 20000 + index * 3.1
  ctx.imageSmoothingEnabled = false
  for (const key of cells) {
    const [c, r] = key.split(',').map(Number) as [number, number]
    const img = rctx.createImageData(pw, ph), o = img.data
    const x0 = c * g.cellW / PIXEL, y0 = r * g.cellH / PIXEL
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const gx = Math.round(x0 + x), gy = Math.round(y0 + y)
        const band = Math.floor(fbm(gx / scale * 3.2 + tt, gy / scale * 3.2 - tt * 0.6) * 9)
        const f = Math.max(0, Math.min(0.9999, 0.08 + band / 9 * 0.7)) * (ramp.length - 1), i = Math.floor(f)
        const color = ramp[f - i > BAYER4[(gy & 3) * 4 + (gx & 3)]! * 0.6 + 0.2 ? i + 1 : i]!
        const k = (y * pw + x) * 4
        o[k] = color[0]; o[k + 1] = color[1]; o[k + 2] = color[2]; o[k + 3] = 255
      }
    }
    rctx.putImageData(img, 0, 0)
    // Inside the cell, the grid's lines left showing.
    ctx.drawImage(reliefCanvas!, 0, 0, pw, ph, g.left + c * g.cellW + 1, g.top + r * g.cellH + 1, g.cellW - 1, g.cellH - 1)
  }
}

function paint(now: number) {
  const el = canvas.value, g = props.grid
  if (!el || !g) return
  step(now)
  const ctx = el.getContext('2d')!
  ctx.clearRect(0, 0, g.boxW, g.boxH)
  shapes.forEach((shape, index) => {
    if (!shape.cells.size) return
    if (props.dark) {
      // Never a lone cell: those with no neighbour in the shape wait until they have one.
      const joined = new Set([...shape.cells].filter((key) => {
        const [c, r] = key.split(',').map(Number) as [number, number]
        return shape.cells.has(keyOf(c + 1, r)) || shape.cells.has(keyOf(c - 1, r)) || shape.cells.has(keyOf(c, r + 1)) || shape.cells.has(keyOf(c, r - 1))
      }))
      if (joined.size >= 2) paintClip(ctx, index, joined)
    }
    else paintRelief(ctx, index, shape.cells, now)
  })
}

function sizeCanvas() {
  const el = canvas.value, g = props.grid
  if (!el || !g) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  el.width = Math.round(g.boxW * dpr)
  el.height = Math.round(g.boxH * dpr)
  el.style.width = `${g.boxW}px`
  el.style.height = `${g.boxH}px`
  el.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
}

let frame = 0
let last = 0
const reduceMotion = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
function loop(now: number) {
  frame = requestAnimationFrame(loop)
  if (now - last < 1000 / FPS || document.hidden) return
  last = now
  paint(now)
}

let started = false
function start() {
  const g = props.grid
  if (!g || started || !props.boxes()) return
  started = true
  lastGrid = [g.left, g.top, g.cols, g.rows, g.cellW, g.cellH].map((v) => Math.round(v)).join()
  crossLeft = Math.max(0, Math.floor(g.cols * 0.2))
  build(reduceMotion ? -1e6 : performance.now())
  playVideos(props.dark)
  if (reduceMotion) paint(performance.now())
}

watch(() => props.round, () => { if (props.shown && !reduceMotion) onHeadline() })
watch(() => props.shown, (on) => { if (on) nextTick(start) })
watch(() => props.dark, (dark) => playVideos(dark))
// A new size: laid out again, already built.
// A new size: laid out again at once, without starting over. The same grid
// measured again (fonts loading, the strip settling) changes nothing.
let lastGrid = ''
watch(() => props.grid, (g) => nextTick(() => {
  const sig = g ? [g.left, g.top, g.cols, g.rows, g.cellW, g.cellH].map((v) => Math.round(v)).join() : ''
  if (sig === lastGrid) return
  lastGrid = sig
  sizeCanvas()
  if (!props.shown) return
  if (!started) return start()
  shapes.forEach((shape, index) => {
    shape.box = boxFor(index)
    shape.changes = []
    shape.cells = new Set()
    const target = resting ? 0 : targetFor(index)
    plan(index, target, Array.from({ length: Math.max(1, target) }, () => 0), -1e6)
  })
}))

onMounted(() => {
  sizeCanvas()
  if (props.shown) nextTick(start)
  frame = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  videoEls.forEach((video) => { video.pause(); video.removeAttribute('src'); video.load() })
})
</script>

<template>
  <canvas ref="canvas" class="splash-layer" aria-hidden="true" />
</template>

<style scoped>
/* Over the grid, under the image band and the headline, in the masses' place. */
.splash-layer {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none;
  transition: opacity 0.5s ease;
}
</style>
