<script setup lang="ts">
// A test bench for the splash's pixel windows (Splash.vue, pixelBurst and
// scrambleShapes): the same loop (a headline deciphering, the masses scrambling
// with it, pixels building inside them, then dissolving) drawn on one canvas,
// with every approach switchable and blendable from the panel. Not linked from
// anywhere, not indexed.
import { decipherFrom } from '~/utils/decipher'
import { generateMass, mulberry32 } from '~/utils/splashShape'

usePageSeo({ noindex: true })

type PixelMode = 'block' | 'quadtree' | 'random'
type GridMode = 'none' | 'inside' | 'everywhere'
type ColorMode = 'cycle' | 'outline'
// What the pixels show: NASA's Europe, or dark mode's videos (one per shape,
// playing) either pixelated or smooth, seen through the pixels as they build.
type Source = 'map' | 'video' | 'video-smooth'
interface Options {
  source: Source
  pixelMode: PixelMode
  pixelSize: number // cells, for 'block'; the largest, for the others
  detail: number // quadtree: how readily a square splits on the map's detail (0 to 1)
  edgeSplit: boolean // quadtree: split squares the outline cuts through
  mapContrast: number
  tintShare: number // of the pixels, roughly, that take some colour
  tintScale: number // pixels across one patch of colour
  accent: number // chance of a solid square
  colorMode: ColorMode
  sweep: number // how strictly pixels build left to right (0: at random)
  pixelFlicker: boolean // pixels flicker on and off before they settle, like the cells
  scrambleEdge: number // of a mass's edge cells, flickering though they end as they were
  gridMode: GridMode
  gridSubdivide: number // finer lines every n cells
  shapeScale: number
  hold: number // ms between headline changes
  dissolve: number // ms
  keepPixels: boolean // pixels stay until the next change instead of dissolving
}

const PRESETS: Record<string, Options> = {
  'Video pixels': { source: 'video', pixelMode: 'quadtree', pixelSize: 4, detail: 0.4, edgeSplit: true, mapContrast: 1.6, tintShare: 0.4, tintScale: 4, accent: 0.04, colorMode: 'cycle', sweep: 0.65, pixelFlicker: true, scrambleEdge: 0.4, gridMode: 'inside', gridSubdivide: 2, shapeScale: 1.3, hold: 4000, dissolve: 1300, keepPixels: false },
  'Video smooth': { source: 'video-smooth', pixelMode: 'quadtree', pixelSize: 4, detail: 0.4, edgeSplit: true, mapContrast: 1, tintShare: 0.35, tintScale: 4, accent: 0, colorMode: 'cycle', sweep: 0.65, pixelFlicker: true, scrambleEdge: 0.4, gridMode: 'none', gridSubdivide: 2, shapeScale: 1.3, hold: 4000, dissolve: 1300, keepPixels: false },
  'Current': { source: 'map', pixelMode: 'block', pixelSize: 3, detail: 0.5, edgeSplit: false, mapContrast: 1, tintShare: 0.45, tintScale: 3, accent: 0.04, colorMode: 'cycle', sweep: 0.65, pixelFlicker: false, scrambleEdge: 0.35, gridMode: 'none', gridSubdivide: 3, shapeScale: 1, hold: 3500, dissolve: 1100, keepPixels: false },
  'Subdivided': { source: 'map', pixelMode: 'quadtree', pixelSize: 4, detail: 0.35, edgeSplit: true, mapContrast: 1.6, tintShare: 0.4, tintScale: 4, accent: 0.05, colorMode: 'cycle', sweep: 0.65, pixelFlicker: true, scrambleEdge: 0.4, gridMode: 'inside', gridSubdivide: 2, shapeScale: 1.2, hold: 3500, dissolve: 1300, keepPixels: false },
  'Map reveal': { source: 'map', pixelMode: 'quadtree', pixelSize: 4, detail: 0.7, edgeSplit: true, mapContrast: 2.2, tintShare: 0.25, tintScale: 6, accent: 0.02, colorMode: 'outline', sweep: 0.8, pixelFlicker: false, scrambleEdge: 0.25, gridMode: 'inside', gridSubdivide: 1, shapeScale: 1.4, hold: 4000, dissolve: 1600, keepPixels: false },
  'Fine grid': { source: 'map', pixelMode: 'block', pixelSize: 1, detail: 0.5, edgeSplit: false, mapContrast: 1.8, tintShare: 0.5, tintScale: 8, accent: 0.03, colorMode: 'cycle', sweep: 0.5, pixelFlicker: true, scrambleEdge: 0.5, gridMode: 'everywhere', gridSubdivide: 3, shapeScale: 1.2, hold: 3500, dissolve: 1100, keepPixels: false },
  'Mosaic': { source: 'map', pixelMode: 'random', pixelSize: 4, detail: 0.5, edgeSplit: true, mapContrast: 1.4, tintShare: 0.55, tintScale: 3, accent: 0.08, colorMode: 'cycle', sweep: 0.3, pixelFlicker: true, scrambleEdge: 0.45, gridMode: 'inside', gridSubdivide: 2, shapeScale: 1.2, hold: 3500, dissolve: 900, keepPixels: false },
}
const opts = reactive<Options>({ ...PRESETS['Subdivided']! })
const preset = ref('Subdivided')
function applyPreset(name: string) {
  preset.value = name
  Object.assign(opts, PRESETS[name]!)
  replay()
}

const HEADLINES = [
  ['SPOTTING', 'DEEPFAKES', 'CAMPAIGNS'],
  ['TRACKING', 'POLITICAL', 'MESSAGING'],
  ['DECODING', 'BOT', 'NETWORKS'],
  ['READING', 'ECHO', 'CHAMBERS'],
]
const MORPH_MS = 1500
const GAP = { first: 70, last: 300 }
const COLORS = BADGE_COLORS
const OUTLINE_COLORS = [BADGE_COLORS[1]!, BADGE_COLORS[2]!, BADGE_COLORS[0]!] // teal, purple, coral, as on the splash
const LIGHT = [244, 244, 242]
const DARK = [159, 161, 163]

const canvasEl = ref<HTMLCanvasElement | null>(null)
const lineEls = ref<HTMLElement[]>([])
const headlineIndex = ref(0)
const headline = computed(() => HEADLINES[headlineIndex.value % HEADLINES.length]!)
const panelOpen = ref(true)

// Grid and masses, in cells.
let cell = 14
let cols = 0
let rows = 0
interface Mass { seed: number, phase: number, left: number, top: number, width: number, height: number, cells: Set<number> }
let masses: Mass[] = []
// level: the map's brightness under it (the video's is read as it plays); t: how
// far into the colour it goes (0: silver).
interface Pixel { x: number, y: number, size: number, level: number, t: number, at: number, on: boolean }
let pixels: Pixel[][] = []
interface Palette { rgb: number[], pale: number[], deep: number[], lut: Uint8ClampedArray }
let palettes: Palette[] = []
let boxes: { x: number, y: number, w: number, h: number }[] = [] // each mass's pixels' box, in cells
const SHAPE_VIDEOS = ['/videos/splash-1.mp4', '/videos/splash-2.mp4', '/videos/splash-3.mp4']
let videos: HTMLVideoElement[] = []
const scratch = import.meta.client ? document.createElement('canvas') : null
let frameLoop = 0
let round = 0
let timers: ReturnType<typeof setTimeout>[] = []
let stops: (() => void)[] = []
let map: { data: Uint8ClampedArray, width: number, height: number } | null = null

const key = (x: number, y: number) => y * 4096 + x
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i]! - v) * t)
const css = (c: number[]) => `rgb(${c.map((v) => Math.round(v)).join(' ')})`
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function massCells(m: Mass) {
  const cells = new Set<number>()
  generateMass(m.seed, m.width, m.height, m.phase).forEach((row, j) => row.forEach((on, i) => {
    if (on) cells.add(key(m.left + i, m.top + j))
  }))
  return cells
}

function layout() {
  const canvas = canvasEl.value
  if (!canvas) return
  const w = window.innerWidth
  const h = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
  cell = Math.max(8, Math.round(h * 0.016))
  cols = Math.ceil(w / cell)
  rows = Math.ceil(h / cell)
  const s = opts.shapeScale
  const mw = Math.round(cols * 0.17 * s)
  const mh = Math.round(rows * 0.3 * s)
  masses = [
    { seed: 73, phase: 0, left: Math.round(cols * 0.06), top: Math.round(rows * 0.1), width: mw, height: mh, cells: new Set() },
    { seed: 41, phase: 0, left: Math.round(cols * 0.94) - mw, top: Math.round(rows * 0.14), width: mw, height: Math.round(mh * 0.9), cells: new Set() },
    { seed: 19, phase: 0, left: Math.round(cols * 0.08), top: Math.round(rows * 0.88) - Math.round(mh * 0.7), width: Math.round(mw * 1.3), height: Math.round(mh * 0.7), cells: new Set() },
  ]
  for (const m of masses) m.cells = massCells(m)
  pixels = []
  draw()
}

function loadMap() {
  const image = new Image()
  image.src = '/nasa/europe-splash.jpg'
  image.onload = () => {
    const width = 480
    const height = Math.round(width * image.naturalHeight / image.naturalWidth)
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(image, 0, 0, width, height)
    map = { data: ctx.getImageData(0, 0, width, height).data, width, height }
  }
}

// The map's brightness over a square of the screen (px): its mean and spread.
function mapStats(left: number, top: number, size: number) {
  if (!map) return { mean: 0.5, spread: 0 }
  const { data, width, height } = map
  const W = window.innerWidth, H = window.innerHeight
  const scale = Math.max(W / width, H / height)
  const ox = (W - width * scale) / 2, oy = (H - height * scale) / 2
  const values: number[] = []
  for (const fy of [0.17, 0.5, 0.83]) {
    for (const fx of [0.17, 0.5, 0.83]) {
      const x = Math.min(width - 1, Math.max(0, Math.floor((left + size * fx - ox) / scale)))
      const y = Math.min(height - 1, Math.max(0, Math.floor((top + size * fy - oy) / scale)))
      const i = (y * width + x) * 4
      values.push((0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255)
    }
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return { mean, spread: Math.max(...values) - Math.min(...values) }
}

function noiseField(seed: number, scale: number) {
  const rand = mulberry32(seed)
  const lattice = new Map<string, number>()
  const at = (x: number, y: number) => {
    const k = `${x},${y}`
    if (!lattice.has(k)) lattice.set(k, rand())
    return lattice.get(k)!
  }
  const s = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const gx = x / scale, gy = y / scale
    const x0 = Math.floor(gx), y0 = Math.floor(gy)
    const tx = s(gx - x0), ty = s(gy - y0)
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx
    return a + (b - a) * ty
  }
}

function palette(colorHex: string): Palette {
  const rgb = hex(colorHex)
  const deep = hex(deepBadgeColor(colorHex))
  // The smooth video's gradient map: the silver negative, its darkest greys (the
  // frame's brightest share) in the colour, as on the tool cards.
  const lut = new Uint8ClampedArray(256 * 3)
  const cut = 1 - opts.tintShare
  for (let k = 0; k < 256; k++) {
    const v = clamp01(0.5 + (k / 255 - 0.5) * opts.mapContrast)
    const silver = mix(LIGHT, DARK, v)
    const t = v <= cut ? 0 : clamp01((v - cut) / Math.max(0.05, 1 - cut))
    const e = t * t * (3 - 2 * t)
    const c = mix(silver, deep, e * 0.9)
    lut.set(c.map(Math.round), k * 3)
  }
  return { rgb, pale: mix(rgb, [255, 255, 255], 0.55), deep, lut }
}
function shade(p: Palette, level: number, t: number) {
  const silver = mix(LIGHT, DARK, clamp01(0.5 + (level - 0.5) * opts.mapContrast))
  if (t <= 0) return silver
  return t < 0.4
    ? mix(silver, p.pale, t / 0.4)
    : t < 0.75 ? mix(p.pale, p.rgb, (t - 0.4) / 0.35) : mix(p.rgb, p.deep, (t - 0.75) / 0.25)
}

// One mass's pixels over its box and a little around: fixed squares, squares
// split where the outline or the map asks for it (quadtree), or a random mix.
function buildPixels(target: Set<number>, current: Set<number>, seed: number) {
  const rand = mulberry32(seed)
  const tint = noiseField(seed + 5, opts.tintScale * cell)
  const union = new Set([...target, ...current])
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const k of union) {
    const x = k % 4096, y = Math.floor(k / 4096)
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const coverage = (x: number, y: number, size: number) => {
    let n = 0
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) if (union.has(key(x + i, y + j))) n++
    return n / (size * size)
  }
  const out: Pixel[] = []
  const last = MORPH_MS - GAP.last
  const W = window.innerWidth
  const push = (x: number, y: number, size: number) => {
    const level = opts.source === 'map' ? mapStats(x * cell, y * cell, size * cell).mean : 0.5
    const cut = 1 - opts.tintShare
    const n = tint((x + size / 2) * cell, (y + size / 2) * cell)
    let t = n <= cut ? 0 : clamp01((n - cut) / Math.max(0.05, 1 - cut) * 1.2)
    if (rand() < opts.accent) t = 0.75 + rand() * 0.25
    out.push({
      x, y, size, level, t,
      at: last * clamp01(((x * cell) / W) * opts.sweep + rand() * (1 - opts.sweep)),
      on: false,
    })
  }
  const split = (x: number, y: number, size: number) => {
    const c = coverage(x, y, size)
    if (c === 0) return
    if (size > 1) {
      const partial = opts.edgeSplit && c < 1
      // A video has no fixed detail to split on: at random, as often as `detail` says.
      const detailed = opts.pixelMode === 'quadtree' && opts.source !== 'map'
        ? rand() < opts.detail * 0.6
        : opts.pixelMode === 'quadtree'
        ? mapStats(x * cell, y * cell, size * cell).spread * opts.mapContrast > (1 - opts.detail) * 0.5
        : rand() < 0.45
      if (partial || detailed) {
        const half = size / 2
        if (Number.isInteger(half)) {
          for (const [dx, dy] of [[0, 0], [half, 0], [0, half], [half, half]]) split(x + dx!, y + dy!, half)
          return
        }
      }
    }
    push(x, y, size)
  }
  const size = opts.pixelMode === 'block' ? opts.pixelSize : 2 ** Math.round(Math.log2(Math.max(1, opts.pixelSize)))
  for (let y = Math.floor(minY / size) * size - size; y <= maxY + size; y += size) {
    for (let x = Math.floor(minX / size) * size - size; x <= maxX + size; x += size) {
      if (opts.pixelMode === 'block') {
        if (coverage(x, y, size) > 0) push(x, y, size)
      }
      else split(x, y, size)
    }
  }
  return out
}

function headlineTicks() {
  const ticks = [0]
  let t = 0
  for (;;) {
    const progress = t / MORPH_MS
    t += (GAP.first + (GAP.last - GAP.first) * progress * progress) * (0.85 + Math.random() * 0.3)
    if (t >= MORPH_MS - GAP.last * 0.6) return ticks
    ticks.push(t)
  }
}
function headlineLocks(lengths: number[]) {
  const raw = lengths.map((length, line) => Array.from({ length }, (_, i) =>
    (i / Math.max(1, length - 1)) * 0.5 + Math.random() * 0.35 + (line / Math.max(1, lengths.length - 1)) * 0.15))
  const latest = Math.max(...raw.flat(), 0.01)
  return raw.map((row) => row.map((value) => MORPH_MS * (0.15 + 0.85 * (value / latest))))
}

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
  stops.forEach((stop) => stop())
  stops = []
}

async function nextRound() {
  clearTimers()
  const previous = [...headline.value]
  headlineIndex.value++
  await nextTick()
  const ticks = headlineTicks()
  const lines = lineEls.value.filter(Boolean)
  const locks = headlineLocks(lines.map((el, i) => Math.max((previous[i] ?? '').length, (el.textContent ?? '').length)))
  stops = lines.map((el, i) => decipherFrom(el, previous[i] ?? '', MORPH_MS, ticks, locks[i]))
  round++
  const rand = mulberry32(round * 7919)
  const W = window.innerWidth

  // The masses: their new form, and each cell's flicker until it lands.
  const flickers = masses.map((m) => {
    const before = m.cells
    m.phase += 0.6
    const after = massCells(m)
    const flicker = new Map<number, { end: boolean, lock: number }>()
    const lockAt = (x: number) => MORPH_MS * (0.15 + 0.85 * clamp01(((x * cell) / W) * 0.6 + rand() * 0.4))
    for (const k of before) if (!after.has(k)) flicker.set(k, { end: false, lock: lockAt(k % 4096) })
    for (const k of after) if (!before.has(k)) flicker.set(k, { end: true, lock: lockAt(k % 4096) })
    for (const k of before) {
      if (flicker.has(k) || rand() > opts.scrambleEdge) continue
      if ([-4096, 1, 4096, -1].some((o) => !before.has(k + o)) && after.has(k)) flicker.set(k, { end: true, lock: lockAt(k % 4096) })
    }
    return { m, after, flicker }
  })
  // The pixels, over both forms.
  palettes = masses.map((_, i) => palette(opts.colorMode === 'cycle' ? COLORS[round % COLORS.length]! : OUTLINE_COLORS[i]!))
  pixels = flickers.map(({ m, after }, i) => buildPixels(after, m.cells, round * 101 + i))
  boxes = pixels.map((list) => {
    if (!list.length) return { x: 0, y: 0, w: 1, h: 1 }
    const x = Math.min(...list.map((p) => p.x)), y = Math.min(...list.map((p) => p.y))
    return { x, y, w: Math.max(...list.map((p) => p.x + p.size)) - x, h: Math.max(...list.map((p) => p.y + p.size)) - y }
  })

  const frame = (at: number, final: boolean) => {
    for (const { m, after, flicker } of flickers) {
      for (const [k, { end, lock }] of flicker) {
        const on = final || at >= lock ? end : rand() < 0.5
        if (on) m.cells.add(k)
        else m.cells.delete(k)
      }
      if (final) m.cells = new Set(after)
    }
    for (const list of pixels) {
      for (const p of list) p.on = final || p.at <= at ? true : opts.pixelFlicker && at > p.at - 500 ? rand() < 0.4 : false
    }
    draw()
  }
  for (const at of ticks) timers.push(setTimeout(() => frame(at, false), at))
  timers.push(setTimeout(() => frame(MORPH_MS, true), MORPH_MS))
  if (!opts.keepPixels) {
    timers.push(setTimeout(() => {
      const all = pixels.flat()
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[all[i], all[j]] = [all[j]!, all[i]!]
      }
      const steps = 14
      for (let s = 1; s <= steps; s++) {
        timers.push(setTimeout(() => {
          for (const p of all.slice(Math.floor(all.length * (s - 1) / steps), Math.floor(all.length * s / steps))) p.on = false
          draw()
        }, opts.dissolve * s / steps))
      }
    }, MORPH_MS + 150))
  }
  timers.push(setTimeout(nextRound, MORPH_MS + opts.hold))
}

function replay() {
  clearTimers()
  layout()
  timers.push(setTimeout(nextRound, 300))
}

// A video frame, covering a box (in px), into the scratch canvas at w × h.
function videoFrame(video: HTMLVideoElement | undefined, box: { w: number, h: number }, w: number, h: number) {
  if (!scratch || !video || video.readyState < 2 || !video.videoWidth) return null
  scratch.width = w
  scratch.height = h
  const sctx = scratch.getContext('2d', { willReadFrequently: true })!
  const scale = Math.max(box.w / video.videoWidth, box.h / video.videoHeight)
  const sw = box.w / scale, sh = box.h / scale
  sctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, w, h)
  return sctx
}

function drawPixels(ctx: CanvasRenderingContext2D, i: number) {
  const list = (pixels[i] ?? []).filter((p) => p.on)
  const p0 = palettes[i]
  if (!list.length || !p0) return
  const box = boxes[i]!
  if (opts.source === 'video-smooth') {
    // The video at half the screen's resolution through the gradient map, seen
    // only through the pixels that are on.
    const w = Math.max(1, Math.round(box.w * cell / 2)), h = Math.max(1, Math.round(box.h * cell / 2))
    const sctx = videoFrame(videos[i], { w: box.w * cell, h: box.h * cell }, w, h)
    if (!sctx) return
    const image = sctx.getImageData(0, 0, w, h)
    const d = image.data
    for (let k = 0; k < d.length; k += 4) {
      const l = Math.round(0.299 * d[k]! + 0.587 * d[k + 1]! + 0.114 * d[k + 2]!) * 3
      d[k] = p0.lut[l]!; d[k + 1] = p0.lut[l + 1]!; d[k + 2] = p0.lut[l + 2]!
    }
    sctx.putImageData(image, 0, 0)
    ctx.save()
    ctx.beginPath()
    for (const p of list) ctx.rect(p.x * cell, p.y * cell, p.size * cell, p.size * cell)
    ctx.clip()
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(scratch!, box.x * cell, box.y * cell, box.w * cell, box.h * cell)
    ctx.restore()
    return
  }
  // Pixelated video: one sample per cell, each pixel the mean of its cells.
  let level: ((p: Pixel) => number) = (p) => p.level
  if (opts.source === 'video') {
    const sctx = videoFrame(videos[i], { w: box.w * cell, h: box.h * cell }, box.w, box.h)
    if (!sctx) return
    const d = sctx.getImageData(0, 0, box.w, box.h).data
    level = (p) => {
      let sum = 0
      for (let y = p.y - box.y; y < p.y - box.y + p.size; y++) {
        for (let x = p.x - box.x; x < p.x - box.x + p.size; x++) {
          const k = (y * box.w + x) * 4
          sum += (0.299 * d[k]! + 0.587 * d[k + 1]! + 0.114 * d[k + 2]!) / 255
        }
      }
      return sum / (p.size * p.size)
    }
  }
  for (const p of list) {
    ctx.fillStyle = css(shade(p0, level(p), p.t))
    ctx.fillRect(p.x * cell, p.y * cell, p.size * cell, p.size * cell)
  }
}

function cellsPath(ctx: CanvasRenderingContext2D, cells: Set<number>) {
  ctx.beginPath()
  for (const k of cells) ctx.rect((k % 4096) * cell, Math.floor(k / 4096) * cell, cell, cell)
}

function draw() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const W = window.innerWidth, H = window.innerHeight
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  const major = 6 // cells between the grid's lines, as on the splash (~84px)
  const gx0 = Math.round(cols * 0.05), gx1 = cols - gx0
  const gy0 = Math.round(rows * 0.12), gy1 = rows - Math.round(rows * 0.1)
  const lines = (every: number, color: string) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = gx0; x <= gx1; x += every) { ctx.moveTo(x * cell + 0.5, gy0 * cell); ctx.lineTo(x * cell + 0.5, gy1 * cell) }
    for (let y = gy0; y <= gy1; y += every) { ctx.moveTo(gx0 * cell, y * cell + 0.5); ctx.lineTo(gx1 * cell, y * cell + 0.5) }
    ctx.stroke()
  }
  if (opts.gridMode === 'everywhere') lines(opts.gridSubdivide, 'rgba(28,28,28,0.12)')
  lines(major, '#1c1c1c')
  masses.forEach((m, i) => {
    ctx.save()
    cellsPath(ctx, m.cells)
    ctx.clip()
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
    drawPixels(ctx, i)
    if (opts.gridMode !== 'none') {
      ctx.strokeStyle = 'rgba(28,28,28,0.14)'
      ctx.beginPath()
      for (let x = 0; x <= cols; x += opts.gridSubdivide) { ctx.moveTo(x * cell + 0.5, 0); ctx.lineTo(x * cell + 0.5, H) }
      for (let y = 0; y <= rows; y += opts.gridSubdivide) { ctx.moveTo(0, y * cell + 0.5); ctx.lineTo(W, y * cell + 0.5) }
      ctx.stroke()
    }
    ctx.restore()
    // The outline: every cell side with no cell beyond it.
    ctx.strokeStyle = OUTLINE_COLORS[i]!
    ctx.lineWidth = 2
    ctx.beginPath()
    for (const k of m.cells) {
      const x = (k % 4096) * cell, y = Math.floor(k / 4096) * cell
      if (!m.cells.has(k - 4096)) { ctx.moveTo(x, y); ctx.lineTo(x + cell, y) }
      if (!m.cells.has(k + 1)) { ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell) }
      if (!m.cells.has(k + 4096)) { ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell) }
      if (!m.cells.has(k - 1)) { ctx.moveTo(x, y); ctx.lineTo(x, y + cell) }
    }
    ctx.stroke()
  })
}

watch(() => [opts.gridMode, opts.gridSubdivide], draw)
watch(() => opts.shapeScale, replay)

onMounted(() => {
  loadMap()
  videos = SHAPE_VIDEOS.map((src) => {
    const video = document.createElement('video')
    Object.assign(video, { src, muted: true, loop: true, playsInline: true, autoplay: true })
    video.play().catch(() => {})
    return video
  })
  // The videos play: redraw every frame while one is the source.
  const loop = () => {
    if (opts.source !== 'map') draw()
    frameLoop = requestAnimationFrame(loop)
  }
  frameLoop = requestAnimationFrame(loop)
  layout()
  window.addEventListener('resize', replay)
  timers.push(setTimeout(nextRound, 800))
})
onUnmounted(() => {
  clearTimers()
  cancelAnimationFrame(frameLoop)
  for (const video of videos) video.pause()
  window.removeEventListener('resize', replay)
})
</script>

<template>
  <!-- At the body's top level, over the site's own bars and stacking. -->
  <Teleport to="body">
  <div class="lab">
    <canvas ref="canvasEl" class="lab-canvas" />
    <div class="lab-title">
      <span v-for="(line, i) in headline" :key="`${headlineIndex}-${i}`" class="lab-line">
        <span :ref="(el) => { if (el) lineEls[i] = el as HTMLElement }">{{ line }}</span>
      </span>
    </div>

    <aside class="lab-panel" :class="{ 'is-closed': !panelOpen }">
      <button class="lab-toggle" type="button" @click="panelOpen = !panelOpen">{{ panelOpen ? 'Hide' : 'Controls' }}</button>
      <template v-if="panelOpen">
        <div class="lab-presets">
          <button v-for="name in Object.keys(PRESETS)" :key="name" type="button" :class="{ on: preset === name }" @click="applyPreset(name)">{{ name }}</button>
        </div>
        <fieldset>
          <legend>Source</legend>
          <label>What the pixels show
            <select v-model="opts.source">
              <option value="map">NASA Europe map</option>
              <option value="video">Videos, pixelated</option>
              <option value="video-smooth">Videos, smooth (silver + colour duotone)</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>Pixels</legend>
          <label>Mode
            <select v-model="opts.pixelMode">
              <option value="block">Fixed squares</option>
              <option value="quadtree">Subdivided (outline + map detail)</option>
              <option value="random">Random mix of sizes</option>
            </select>
          </label>
          <label>Size (cells) <b>{{ opts.pixelSize }}</b><input v-model.number="opts.pixelSize" type="range" min="1" max="8" step="1"></label>
          <label v-if="opts.pixelMode === 'quadtree'">Split on map detail <b>{{ opts.detail.toFixed(2) }}</b><input v-model.number="opts.detail" type="range" min="0" max="1" step="0.05"></label>
          <label v-if="opts.pixelMode !== 'block'" class="check"><input v-model="opts.edgeSplit" type="checkbox"> Split squares along the outline</label>
          <label class="check"><input v-model="opts.pixelFlicker" type="checkbox"> Pixels flicker before settling</label>
          <label>Left-to-right sweep <b>{{ opts.sweep.toFixed(2) }}</b><input v-model.number="opts.sweep" type="range" min="0" max="1" step="0.05"></label>
        </fieldset>
        <fieldset>
          <legend>Colour</legend>
          <label>Map contrast <b>{{ opts.mapContrast.toFixed(1) }}</b><input v-model.number="opts.mapContrast" type="range" min="0.5" max="3" step="0.1"></label>
          <label>Colour share <b>{{ opts.tintShare.toFixed(2) }}</b><input v-model.number="opts.tintShare" type="range" min="0" max="1" step="0.05"></label>
          <label>Colour patch size <b>{{ opts.tintScale }}</b><input v-model.number="opts.tintScale" type="range" min="1" max="12" step="1"></label>
          <label>Solid squares <b>{{ opts.accent.toFixed(2) }}</b><input v-model.number="opts.accent" type="range" min="0" max="0.3" step="0.01"></label>
          <label>Colour per round
            <select v-model="opts.colorMode">
              <option value="cycle">Cycle coral, teal, purple</option>
              <option value="outline">Each shape's outline colour</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>Shapes and grid</legend>
          <label>Shape scramble <b>{{ opts.scrambleEdge.toFixed(2) }}</b><input v-model.number="opts.scrambleEdge" type="range" min="0" max="1" step="0.05"></label>
          <label>Shape size <b>{{ opts.shapeScale.toFixed(1) }}</b><input v-model.number="opts.shapeScale" type="range" min="0.6" max="2" step="0.1"></label>
          <label>Subdivisions
            <select v-model="opts.gridMode">
              <option value="none">None</option>
              <option value="inside">Inside the shapes</option>
              <option value="everywhere">Everywhere</option>
            </select>
          </label>
          <label v-if="opts.gridMode !== 'none'">Every (cells) <b>{{ opts.gridSubdivide }}</b><input v-model.number="opts.gridSubdivide" type="range" min="1" max="6" step="1"></label>
        </fieldset>
        <fieldset>
          <legend>Timing</legend>
          <label>Hold (ms) <b>{{ opts.hold }}</b><input v-model.number="opts.hold" type="range" min="1500" max="8000" step="250"></label>
          <label>Dissolve (ms) <b>{{ opts.dissolve }}</b><input v-model.number="opts.dissolve" type="range" min="200" max="3000" step="100"></label>
          <label class="check"><input v-model="opts.keepPixels" type="checkbox"> Keep pixels until the next change</label>
        </fieldset>
        <button class="lab-replay" type="button" @click="replay">Replay</button>
      </template>
    </aside>
  </div>
  </Teleport>
</template>

<style scoped>
.lab {
  position: fixed;
  inset: 0;
  /* Over the site's own bars (the app shell still renders around the page). */
  z-index: 2147483000;
  background: #fff;
  overflow: hidden;
}

.lab-canvas {
  position: absolute;
  inset: 0;
}

.lab-title {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 28px;
  background: #fff;
  font-family: var(--font-text);
  font-weight: 700;
  font-size: clamp(48px, 8vw, 120px);
  line-height: 0.84;
  letter-spacing: -0.02em;
  color: #1c1c1c;
  white-space: nowrap;
  pointer-events: none;
}

.lab-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 270px;
  max-height: calc(100vh - 24px);
  overflow: auto;
  padding: 10px 12px 12px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #1c1c1c;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #1c1c1c;
}

.lab-panel.is-closed {
  width: auto;
  padding: 0;
}

.lab-panel button {
  font: inherit;
  cursor: pointer;
  border: 1px solid #1c1c1c;
  background: #fff;
  padding: 3px 6px;
}

.lab-panel button.on {
  background: #1c1c1c;
  color: #fff;
}

.lab-toggle {
  float: right;
}

.lab-panel.is-closed .lab-toggle {
  float: none;
  border: 0;
}

.lab-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 26px 0 8px;
}

.lab-panel fieldset {
  border: 0;
  border-top: 1px solid #ccc;
  margin: 6px 0 0;
  padding: 6px 0 0;
}

.lab-panel legend {
  font-weight: 700;
  text-transform: uppercase;
  padding: 0;
}

.lab-panel label {
  display: block;
  margin: 5px 0;
}

.lab-panel label b {
  float: right;
  font-weight: 400;
}

.lab-panel label.check {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lab-panel input[type='range'],
.lab-panel select {
  display: block;
  width: 100%;
  margin-top: 2px;
  font: inherit;
}

.lab-replay {
  width: 100%;
  margin-top: 10px;
}
</style>
