<script setup lang="ts">
// /?splash=uncertainty: "Mapping uncertainty" (app/utils/cartography.ts for
// the system and its synthetic data). Two canvases: the world (ocean, limb,
// measurement traces, land, lacunae, observation passes), redrawn when the
// view moves; over it the events (origins, routes, relays, the radial
// index), redrawn on hover, selection and layer switches too. Typography
// over both in HTML.
//
// Reading it: drag to turn the globe, scroll to zoom (detail and labels
// come in with scale), hover a case (its origin cloud, a relay or its spokes
// in the index) to isolate it, click to select it (its evidence, origins,
// routes and their certainty), switch the evidence layer to watch its origin
// move.
import {
  LAYERS, type LayerKey, type Certainty, type CampaignEvent, type Hypothesis, type View, type Synthetic, type Country,
  loadWorld, makeSynthetic, project, invert, greatCircle, angularDistance, orbitPoint, mixHypothesis, coverage, rng,
} from '~/utils/cartography'
import worldCells from '~/data/worldCells.json'
import { type WorldSettings, WORLD_DEFAULTS, worldShapes, worldShown, worldRgb, worldColor, drawWorldMark } from '~/utils/worldGlobe'

// 'night' (/?splash=uncertainty): the globe from far off, dark. 'ice'
// (/?splash=ice, after the "Protecting the ocean" fishing-effort map): the
// oceans as one dark mass round the South Atlantic (azimuthal
// equidistant), pale land and pale space filled with tangled trajectories,
// detections along the coasts in electric blue, a large radial index.
// 'world' (/?splash=basics,world,lab, 22 Nov 2026): night's instrument, its
// land drawn as basics,world's pixel world (SplashWorldGlobe.vue): the same
// cells, looks, colours and coming and going (`settings`, its editor in
// Splash.vue), put on this globe (the disc's front as the hemisphere round
// 0°, 0°, its mirrored copy round 180°), turning with it under the drag. The
// cells are the SVG's stylised layout, not the coastlines: those are dropped.
const props = withDefaults(defineProps<{
  variant?: 'night' | 'ice' | 'world'
  /** world: the pixel world's settings (utils/worldGlobe.ts). */
  settings?: WorldSettings
  /** world: the colours its shapes' indices point into. */
  colors?: string[]
}>(), { variant: 'night', settings: () => WORLD_DEFAULTS, colors: () => ['#C6C6C6'] })
const ICE = props.variant === 'ice'
const WORLD = props.variant === 'world'

const root = ref<HTMLElement | null>(null)
const worldCanvas = ref<HTMLCanvasElement | null>(null)
const landCanvas = ref<HTMLCanvasElement | null>(null)
const eventCanvas = ref<HTMLCanvasElement | null>(null)

const ready = ref(false)
const layer = ref<LayerKey>('accounts')
const hovered = ref<number | null>(null)
const selected = ref<number | null>(null)
const cursor = ref<{ lon: number, lat: number, cov: number } | null>(null)
const scaleLabel = ref('')
const zoomLevel = ref(1)

let world: Country[] = []
let data: Synthetic | null = null
const events = shallowRef<CampaignEvent[]>([])

// Colours: near-black ocean, pale blue structures, cyan signals, one warm
// accent for contradictions.
// (Ice: signals in an electric blue that reads on the dark sea and the
// pale land alike, text in navy with a pale halo.)
const C = ICE
  ? { ice: '236, 243, 247', pale: '22, 40, 64', cyan: '52, 82, 255', white: '250, 252, 253', warm: '240, 74, 36', ink: '12, 26, 46' }
  : { ice: '206, 226, 238', pale: '150, 190, 214', cyan: '64, 200, 240', white: '240, 246, 250', warm: '255, 92, 54', ink: '240, 246, 250' }
const MONO = '"ABC Areal Mono", ui-monospace, monospace'

// ---- View ----
let width = 0
let height = 0
let ratio = 1
const view: View = ICE
  ? { lon: 18, lat: -38, scale: 1, cx: 0, cy: 0, r: 0, mode: 'azeq', cMax: 150 }
  : { lon: 14, lat: -6, scale: 1, cx: 0, cy: 0, r: 0 }
let baseR = 0
function layoutView() {
  baseR = ICE ? height * 0.78 : height * 1.08
  view.cx = width * (ICE ? 0.42 : 0.46)
  view.cy = height * (ICE ? 0.58 : 1.12)
  view.r = baseR * view.scale
}
// Degrees per pixel at the centre, for dragging.
function degPerPx() {
  return ICE ? (view.cMax ?? 150) / view.r : 180 / Math.PI / view.r
}
// Text on the map: in ice, navy with a pale halo, so it reads on both grounds.
function mapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  if (ICE) {
    ctx.save()
    ctx.strokeStyle = 'rgba(214, 228, 236, 0.85)'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.strokeText(text, x, y)
    ctx.restore()
  }
  ctx.fillText(text, x, y)
}

// Layer switch in progress (from → to, t 0–1).
let layerFrom: LayerKey = 'accounts'
let layerT = 1
function shownOrigins(ev: CampaignEvent): [Hypothesis, Hypothesis] {
  const a = ev.layers[layerFrom].origins
  const b = ev.layers[layer.value].origins
  if (layerT >= 1) return b
  return [mixHypothesis(a[0], b[0], layerT), mixHypothesis(a[1], b[1], layerT)]
}
function shownLayer(ev: CampaignEvent) {
  return ev.layers[layerT < 0.5 ? layerFrom : layer.value]
}

// ---- Drawing helpers ----
function strokePath(ctx: CanvasRenderingContext2D, pts: { x: number, y: number, depth: number }[], minDepth = 0) {
  let open = false
  ctx.beginPath()
  for (const p of pts) {
    if (p.depth < minDepth) { open = false; continue }
    if (!open) { ctx.moveTo(p.x, p.y); open = true } else ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
}
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Night's real land: a faint fill, then its stipple.
function drawRealLand(ctx: CanvasRenderingContext2D) {
  if (!data) return
  const R = view.r
  const z = view.scale
  ctx.fillStyle = 'rgba(14, 26, 36, 0.9)'
  for (const country of world) {
    ctx.beginPath()
    for (const ring of country.rings) {
      let started = false
      let anyVisible = false
      for (const [lon, lat] of ring) {
        const p = project(view, lon, lat)
        let { x, y } = p
        if (p.depth < 0) {
          // Behind: pressed onto the limb, so the fill stays clipped to it.
          const dx = x - view.cx
          const dy = y - view.cy
          const m = Math.hypot(dx, dy) || 1
          x = view.cx + (dx / m) * R
          y = view.cy + (dy / m) * R
        } else anyVisible = true
        if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      }
      if (!anyVisible) continue
      ctx.closePath()
    }
    ctx.fill('evenodd')
  }
  const st = data.stipple
  const dot = Math.min(1.6, 0.7 + z * 0.12)
  ctx.fillStyle = `rgba(${C.ice}, ${Math.min(0.55, 0.26 + z * 0.04)})`
  for (let i = 0; i < st.length; i += 2) {
    const p = project(view, st[i]!, st[i + 1]!)
    if (p.depth < 0.02 || p.x < -2 || p.y < -2 || p.x > width + 2 || p.y > height + 2) continue
    ctx.fillRect(p.x, p.y, dot, dot)
  }
}

// ---- The world layer ----
function drawWorld() {
  if (ICE) return drawWorldIce()
  const canvas = worldCanvas.value
  if (!canvas || !data) return
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const R = view.r
  const z = view.scale

  // Shells round the limb, at real altitudes (Kármán line, low orbits).
  const shells: [number, string][] = [[100, 'KÁRMÁN LINE · 100 KM'], [550, 'LOW ORBIT · 550 KM'], [1200, '1 200 KM'], [2000, 'LEO LIMIT · 2 000 KM']]
  ctx.font = `9px ${MONO}`
  for (const [k, [km, label]] of shells.entries()) {
    const rr = R * (1 + km / 6371)
    ctx.strokeStyle = `rgba(${C.pale}, ${0.22 - k * 0.04})`
    ctx.lineWidth = 0.6
    ctx.setLineDash(k === 0 ? [] : [2, 5 + k * 2])
    ctx.beginPath()
    ctx.arc(view.cx, view.cy, rr, 0, Math.PI * 2)
    ctx.stroke()
    // Its label along it, upper left.
    const a = -Math.PI / 2 - 0.62 - k * 0.05
    ctx.save()
    ctx.translate(view.cx + Math.cos(a) * (rr + 5), view.cy + Math.sin(a) * (rr + 5))
    ctx.rotate(a + Math.PI / 2)
    ctx.fillStyle = `rgba(${C.pale}, 0.55)`
    ctx.fillText(label, 0, 0)
    ctx.restore()
  }
  ctx.setLineDash([])

  // The disc: barely lighter than space. (world: on the land canvas, under.)
  if (!WORLD) {
    ctx.fillStyle = '#071017'
    ctx.beginPath()
    ctx.arc(view.cx, view.cy, R, 0, Math.PI * 2)
    ctx.fill()
  }

  // Graticule: every 10°, dotted; every 30° a little firmer.
  for (let lon = -180; lon < 180; lon += 10) {
    const pts = []
    for (let lat = -80; lat <= 80; lat += 2) pts.push(project(view, lon, lat))
    ctx.strokeStyle = `rgba(${C.pale}, ${lon % 30 === 0 ? 0.13 : 0.06})`
    ctx.lineWidth = 0.5
    ctx.setLineDash([1, 3])
    strokePath(ctx, pts)
  }
  for (let lat = -80; lat <= 80; lat += 10) {
    const pts = []
    for (let lon = -180; lon <= 180; lon += 2) pts.push(project(view, lon, lat))
    ctx.strokeStyle = `rgba(${C.pale}, ${lat % 30 === 0 ? 0.13 : 0.06})`
    strokePath(ctx, pts)
  }
  ctx.setLineDash([])

  // Land: a faint fill, then its stipple. (world: the pixel world instead,
  // drawLand, on its own canvas.)
  if (!WORLD) drawRealLand(ctx)

  // Measurement traces: thousands of fine lines, thinning to nothing.
  ctx.strokeStyle = `rgba(${C.ice}, ${Math.max(0.05, 0.075 - z * 0.004)})`
  ctx.lineWidth = 0.5
  ctx.beginPath()
  for (const tr of data.traces) {
    let open = false
    for (let i = 0; i < tr.length; i += 2) {
      const p = project(view, tr[i]!, tr[i + 1]!)
      if (p.depth < 0) { open = false; continue }
      if (!open) { ctx.moveTo(p.x, p.y); open = true } else ctx.lineTo(p.x, p.y)
    }
  }
  ctx.stroke()

  // Coasts and borders (every ring's outline). Not in world: they'd fight
  // the pixel world's own layout.
  ctx.lineWidth = 0.7
  ctx.strokeStyle = `rgba(${C.ice}, 0.62)`
  for (const country of WORLD ? [] : world) {
    for (const ring of country.rings) {
      strokePath(ctx, ring.map(([lon, lat]) => project(view, lon, lat)))
    }
  }

  // Observation passes: ground tracks, ticked, one labelled.
  ctx.font = `8.5px ${MONO}`
  for (const orbit of data.orbits) {
    const pts = Array.from({ length: 361 }, (_, k) => {
      const [lon, lat] = orbitPoint(orbit.inc, orbit.node, k / 360)
      return { ...project(view, lon, lat, 0.035), t: k }
    })
    ctx.strokeStyle = `rgba(${C.pale}, 0.32)`
    ctx.lineWidth = 0.6
    ctx.setLineDash([6, 3, 1, 3])
    strokePath(ctx, pts)
    ctx.setLineDash([])
    let labelled = false
    for (const p of pts) {
      if (p.depth < 0.1 || p.t % 12 !== 0) continue
      ctx.fillStyle = `rgba(${C.pale}, 0.5)`
      ctx.fillRect(p.x - 2, p.y - 0.25, 4, 0.5)
      ctx.fillRect(p.x - 0.25, p.y - 2, 0.5, 4)
      if (!labelled && p.x > 80 && p.x < width - 300 && p.y > 120 && p.y < height - 120) {
        ctx.fillStyle = `rgba(${C.pale}, 0.75)`
        ctx.fillText(orbit.label, p.x + 6, p.y - 6)
        labelled = true
      }
    }
  }

  // Lacunae: erased. Everything inside goes (back to the ground), a ragged
  // edge, a dotted boundary, a label.
  for (const lac of data.lacunae) {
    const ring = []
    for (let k = 0; k <= 72; k++) {
      const a = (k / 72) * Math.PI * 2
      const rr = lac.r * (0.86 + 0.22 * hash(k * 3.1 + lac.lon))
      const lat = lac.lat + Math.sin(a) * rr
      const lon = lac.lon + (Math.cos(a) * rr) / Math.cos((lac.lat * Math.PI) / 180)
      ring.push(project(view, lon, lat))
    }
    if (ring.every((p) => p.depth < 0)) continue
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ring.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = `rgba(${C.pale}, 0.45)`
    ctx.lineWidth = 0.6
    ctx.setLineDash([1, 3])
    strokePath(ctx, ring)
    ctx.setLineDash([])
    const c = project(view, lac.lon, lac.lat)
    if (c.depth > 0.1) {
      ctx.fillStyle = `rgba(${C.pale}, 0.7)`
      ctx.font = `8.5px ${MONO}`
      ctx.fillText(`${lac.id} · NO RECORD`, c.x - 30, c.y + 3)
    }
  }

  // The limb.
  ctx.strokeStyle = `rgba(${C.white}, 0.75)`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(view.cx, view.cy, R, 0, Math.PI * 2)
  ctx.stroke()
}

// ---- The pixel world (world) ----
// basics,world's cells on this globe: the disc's front as the hemisphere
// round 0°, 0°, its mirrored copy round 180°. Its own canvas, under the
// world's (its traces, passes and limb drawn over it), redrawn every frame
// so its shapes can come and go; the world's only when the view moves.
interface LandCell { lon: number, lat: number, shape: number, seed: number, mix: number, edge: boolean, h: number }
const landCells: LandCell[] = []
if (WORLD) {
  const cells = worldCells.cells as [number, number, number][]
  const occupied = new Set(cells.map(([x, y, s]) => `${Math.round(x)},${Math.round(y)},${s}`))
  const isEdge = (x: number, y: number, s: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !occupied.has(`${Math.round(x) + dx!},${Math.round(y) + dy!},${s}`))
  let a = 977
  const grain = () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (const copy of [0, 1]) {
    for (const [cx, cy, s] of cells) {
      const x = cx / worldCells.radius
      const y = cy / worldCells.radius
      const z = Math.sqrt(Math.max(0, 1 - x * x - y * y))
      const lon = (Math.atan2(x, z) * 180) / Math.PI + copy * 180
      landCells.push({
        lon: lon > 180 ? lon - 360 : lon,
        lat: (-Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI,
        shape: s + copy * worldCells.shapes,
        seed: grain(),
        mix: Math.min(1, Math.max(0, 0.5 + 0.5 * Math.sin(cx * 0.21 + cy * 0.13 + s) + (grain() - 0.5) * 0.25)),
        edge: isEdge(cx, cy, s),
        h: 0.5 + 0.5 * Math.sin((copy ? -x : x) * 9 + y * 7 + (copy ? -z : z) * 5),
      })
    }
  }
}
const landShapes = computed(() => (WORLD ? worldShapes(props.settings, worldCells.shapes * 2) : []))
let landRgb: [number, number, number][] = []
let landStart = 0
function readLandColors() {
  if (WORLD && root.value) landRgb = worldRgb(root.value, props.colors)
}
function lacunaRing(lac: { lon: number, lat: number, r: number }) {
  const ring = []
  for (let k = 0; k <= 72; k++) {
    const a = (k / 72) * Math.PI * 2
    const rr = lac.r * (0.86 + 0.22 * hash(k * 3.1 + lac.lon))
    const lat = lac.lat + Math.sin(a) * rr
    const lon = lac.lon + (Math.cos(a) * rr) / Math.cos((lac.lat * Math.PI) / 180)
    ring.push(project(view, lon, lat))
  }
  return ring
}
function drawLand(now: number) {
  const canvas = landCanvas.value
  if (!WORLD || !canvas || !data) return
  const ctx = canvas.getContext('2d')!
  if (!landRgb.length) readLandColors()
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const R = view.r
  const s = props.settings
  const t = (now - landStart) / 1000
  const all = landShapes.value
  const share = all.map((shape) => worldShown(shape, t, s.shown))
  const cell = R / worldCells.radius
  for (const p of landCells) {
    if (!s.mirror && p.shape >= worldCells.shapes) continue
    if (p.seed >= share[p.shape]!) continue
    const shape = all[p.shape]!
    if (shape.look === 'outline' && !p.edge) continue
    const q = project(view, p.lon, p.lat)
    if (q.depth <= 0) continue
    if (q.x < -cell || q.y < -cell || q.x > width + cell || q.y > height + cell) continue
    const rim = 1 - s.rim + s.rim * q.depth
    const alpha = s.alpha * shape.alpha * rim
    if (alpha <= 0.005) continue
    drawWorldMark(ctx, shape.look, q.x, q.y, cell, 0.45 + 0.55 * rim, s, worldColor(landRgb, shape, p.mix, s.blend, alpha), shape.size, p.h)
  }

  // Lacunae erase the land too.
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  for (const lac of data.lacunae) {
    const ring = lacunaRing(lac)
    if (ring.every((p) => p.depth < 0)) continue
    ctx.beginPath()
    ring.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
    ctx.fill()
  }
  // ...then the disc's ground under what's left.
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#071017'
  ctx.beginPath()
  ctx.arc(view.cx, view.cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
let landFrame = 0
function landLoop(now: number) {
  drawLand(now)
  landFrame = requestAnimationFrame(landLoop)
}
watch(() => [props.settings, props.colors], () => {
  readLandColors()
  if (reducedMotion()) drawLand(landStart + 9000)
}, { deep: true })

// ---- The world, ice (/?splash=ice) ----
// Pale ground everywhere, tangled with trajectories; the oceans one dark
// mass, its edge soft, grained with the record's density; detections along
// the coasts in electric blue; observation zones outlined at sea; lacunae
// as pale holes in the dark.
let tangles: HTMLCanvasElement | null = null
function buildTangles() {
  // Screen space, built once a size: hundreds of long looping paths.
  const c = document.createElement('canvas')
  c.width = Math.round(width * ratio)
  c.height = Math.round(height * ratio)
  const ctx = c.getContext('2d')!
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  const r = rng(77)
  ctx.lineCap = 'round'
  for (let i = 0; i < 1100; i++) {
    let x = r() * width
    let y = r() * height
    let a = r() * Math.PI * 2
    let turn = (r() - 0.5) * 0.08
    const steps = 80 + Math.floor(r() * 260)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.16 + r() * 0.34})`
    ctx.lineWidth = 0.35 + r() * 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < steps; k++) {
      // Drifting curvature: long sweeps that sometimes close into loops.
      turn += (r() - 0.5) * 0.02
      turn = Math.max(-0.09, Math.min(0.09, turn))
      a += turn
      x += Math.cos(a) * 4
      y += Math.sin(a) * 4
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  tangles = c
}
function drawWorldIce() {
  const canvas = worldCanvas.value
  if (!canvas || !data) return
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const R = view.r
  const z = view.scale

  // The pale ground, a little lighter at the top right, and its tangles.
  const g = ctx.createRadialGradient(width * 0.85, height * 0.1, 0, width * 0.6, height * 0.4, width * 0.9)
  g.addColorStop(0, '#dbe8ee')
  g.addColorStop(1, '#b9cfda')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
  if (tangles) ctx.drawImage(tangles, 0, 0, width, height)

  // The sea: the cut's disc, soft at its edge, minus the land.
  const seaPath = new Path2D()
  seaPath.arc(view.cx, view.cy, R, 0, Math.PI * 2)
  ctx.save()
  ctx.filter = `blur(${Math.round(10 + R * 0.012)}px)`
  ctx.fillStyle = 'rgba(11, 20, 30, 0.96)'
  ctx.fill(seaPath)
  ctx.restore()
  ctx.fillStyle = '#0b141e'
  ctx.beginPath()
  ctx.arc(view.cx, view.cy, R * 0.985, 0, Math.PI * 2)
  ctx.fill()

  // The record at sea: dense grain where dense, almost none elsewhere.
  const sea = data.sea
  ctx.fillStyle = `rgba(214, 226, 234, ${Math.min(0.5, 0.26 + z * 0.05)})`
  const d = Math.min(1.4, 0.65 + z * 0.12)
  for (let i = 0; i < sea.length; i += 2) {
    const p = project(view, sea[i]!, sea[i + 1]!)
    if (p.depth < 0.01 || p.x < 0 || p.y < 0 || p.x > width || p.y > height) continue
    ctx.fillRect(p.x, p.y, d, d)
  }

  // Land: pale, over the sea (its rings beyond the cut pressed onto it).
  // A ring running past the cut follows the cut's circle round (by small
  // steps, the short way), never a chord across the sea.
  const land = new Path2D()
  const rimR = R * 1.02
  for (const country of world) {
    for (const ring of country.rings) {
      const pts = ring.map(([lon, lat]) => project(view, lon, lat))
      if (pts.every((p) => p.depth < 0)) continue
      let started = false
      let lastAngle: number | null = null
      const to = (x: number, y: number) => {
        if (!started) { land.moveTo(x, y); started = true } else land.lineTo(x, y)
      }
      for (const p of pts) {
        if (p.depth >= 0) {
          to(p.x, p.y)
          lastAngle = null
          continue
        }
        const a = Math.atan2(p.y - view.cy, p.x - view.cx)
        if (lastAngle !== null) {
          let da = a - lastAngle
          if (da > Math.PI) da -= Math.PI * 2
          if (da < -Math.PI) da += Math.PI * 2
          const steps = Math.ceil(Math.abs(da) / 0.06)
          for (let k = 1; k < steps; k++) {
            const b = lastAngle + (da * k) / steps
            to(view.cx + Math.cos(b) * rimR, view.cy + Math.sin(b) * rimR)
          }
        }
        to(view.cx + Math.cos(a) * rimR, view.cy + Math.sin(a) * rimR)
        lastAngle = a
      }
      if (started) land.closePath()
    }
  }
  ctx.save()
  ctx.clip(seaPath)
  ctx.fillStyle = '#c6d8e1'
  ctx.fill(land, 'evenodd')
  ctx.restore()

  // Observation zones at sea (synthetic): white outlines, circles and
  // polygons, a few with points inside.
  ctx.lineWidth = 0.7
  for (const zone of data.zones) {
    const cosl = Math.cos((zone.lat * Math.PI) / 180) || 1
    const n = zone.sides || 40
    const pts = []
    for (let k = 0; k <= n; k++) {
      const a = zone.turn + (k / n) * Math.PI * 2
      pts.push(project(view, zone.lon + (Math.cos(a) * zone.r) / cosl, zone.lat + Math.sin(a) * zone.r))
    }
    if (pts.every((p) => p.depth < 0)) continue
    ctx.strokeStyle = 'rgba(236, 243, 247, 0.75)'
    ctx.setLineDash(zone.sides ? [] : (zone.r > 3 ? [3, 3] : []))
    strokePath(ctx, pts)
    if (z > 1.6) {
      const c = project(view, zone.lon, zone.lat)
      if (c.depth > 0) {
        ctx.font = `8px ${MONO}`
        ctx.fillStyle = 'rgba(236, 243, 247, 0.7)'
        ctx.fillText(zone.id, c.x + 3, c.y + 3)
      }
    }
  }
  ctx.setLineDash([])

  // Monitoring perimeters: each sizeable coast's outline, swollen off it,
  // dashed white (synthetic; read as a perimeter, not a border).
  ctx.strokeStyle = 'rgba(236, 243, 247, 0.38)'
  ctx.lineWidth = 0.6
  ctx.setLineDash([4, 3])
  for (const country of world) {
    for (const ring of country.rings) {
      if (ring.length < 40) continue
      let cx = 0, cy = 0
      for (const [lon, lat] of ring) { cx += lon; cy += lat }
      cx /= ring.length
      cy /= ring.length
      strokePath(ctx, ring.filter((_, i) => i % 2 === 0).map(([lon, lat]) => project(view, cx + (lon - cx) * 1.07, cy + (lat - cy) * 1.07)), 0.02)
    }
  }
  ctx.setLineDash([])

  // Borders and coasts, thin and dark on the pale land.
  ctx.strokeStyle = 'rgba(40, 62, 80, 0.55)'
  ctx.lineWidth = 0.55
  for (const country of world) {
    for (const ring of country.rings) strokePath(ctx, ring.map(([lon, lat]) => project(view, lon, lat)))
  }

  // Detections along the coasts: electric blue, brightest where densest.
  const coastal = data.coastal
  for (let i = 0; i < coastal.length; i += 2) {
    const p = project(view, coastal[i]!, coastal[i + 1]!)
    if (p.depth < 0.01) continue
    const h = hash(i)
    ctx.fillStyle = h < 0.55 ? 'rgba(52, 82, 255, 0.85)' : h < 0.85 ? 'rgba(96, 124, 255, 0.7)' : 'rgba(210, 222, 255, 0.8)'
    ctx.fillRect(p.x, p.y, 1.3, 1.3)
  }

  // Lacunae: pale holes in the dark, a fine outline round them.
  for (const lac of data.lacunae) {
    const ring = []
    for (let k = 0; k <= 72; k++) {
      const a = (k / 72) * Math.PI * 2
      const rr = lac.r * (0.86 + 0.22 * hash(k * 3.1 + lac.lon))
      ring.push(project(view, lac.lon + (Math.cos(a) * rr) / Math.cos((lac.lat * Math.PI) / 180), lac.lat + Math.sin(a) * rr))
    }
    if (ring.every((p) => p.depth < 0)) continue
    ctx.save()
    ctx.clip(seaPath)
    ctx.fillStyle = '#d3e2e9'
    ctx.beginPath()
    ring.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = 'rgba(22, 40, 64, 0.5)'
    ctx.lineWidth = 0.6
    ctx.setLineDash([1, 3])
    strokePath(ctx, ring)
    ctx.setLineDash([])
    const c = project(view, lac.lon, lac.lat)
    if (c.depth > 0.05) {
      ctx.fillStyle = 'rgba(22, 40, 64, 0.8)'
      ctx.font = `8.5px ${MONO}`
      ctx.fillText(`${lac.id} · NO RECORD`, c.x - 30, c.y + 3)
    }
  }
}

// ---- The events layer ----
type Pt = { x: number, y: number, depth: number }
// The arc of a route, lifted off the surface by its length.
function routeArc(a: [number, number], b: [number, number]) {
  const d = angularDistance(a, b)
  const h = 0.012 + (d / 180) * 0.16
  const n = Math.max(16, Math.round(d * 1.2))
  return greatCircle(a, b, n).map(([lon, lat], i, all) => project(view, lon, lat, h * Math.sin((Math.PI * i) / (all.length - 1))))
}
function drawRoute(ctx: CanvasRenderingContext2D, pts: Pt[], cert: Certainty, alpha: number, seed: number, strong: boolean) {
  const w = strong ? 1.1 : 0.8
  if (cert === 'verified') {
    if (ICE) {
      ctx.strokeStyle = `rgba(${C.ink}, ${0.7 * alpha})`
      ctx.lineWidth = w + 1.6
      strokePath(ctx, pts, -0.02)
    }
    ctx.strokeStyle = `rgba(${C.white}, ${0.85 * alpha})`
    ctx.lineWidth = w
    strokePath(ctx, pts, -0.02)
  } else if (cert === 'unconfirmed') {
    // Fragments: pieces skipped, others fainter, set a little off the line.
    ctx.lineWidth = w * 0.9
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const h = hash(seed * 7.3 + i)
      if (h < 0.3) continue
      const a = pts[i]!
      const b = pts[Math.min(pts.length - 1, i + 2)]!
      if (a.depth < -0.02 || b.depth < -0.02) continue
      const off = (hash(seed + i * 1.7) - 0.5) * 2.4
      const dx = b.x - a.x
      const dy = b.y - a.y
      const m = Math.hypot(dx, dy) || 1
      ctx.strokeStyle = `rgba(${C.cyan}, ${(0.18 + h * 0.6) * alpha})`
      ctx.beginPath()
      ctx.moveTo(a.x - (dy / m) * off, a.y + (dx / m) * off)
      ctx.lineTo(b.x - (dy / m) * off, b.y + (dx / m) * off)
      ctx.stroke()
    }
  } else if (cert === 'missing') {
    // Its ends documented, its middle not: the line stops, ticks at the breaks.
    const n = pts.length
    const cut1 = Math.floor(n * 0.28)
    const cut2 = Math.ceil(n * 0.72)
    ctx.strokeStyle = ICE ? `rgba(${C.ink}, ${0.8 * alpha})` : `rgba(${C.ice}, ${0.7 * alpha})`
    ctx.lineWidth = w * 0.8
    strokePath(ctx, pts.slice(0, cut1 + 1), -0.02)
    strokePath(ctx, pts.slice(cut2), -0.02)
    for (const k of [cut1, cut2]) {
      // (A route of two points, its origin on its relay, has no break.)
      const p = pts[k]
      const q = pts[Math.min(n - 1, k + 1)]
      if (!p || !q || p.depth < 0) continue
      const dx = q.x - p.x
      const dy = q.y - p.y
      const m = Math.hypot(dx, dy) || 1
      ctx.beginPath()
      ctx.moveTo(p.x - (dy / m) * 4, p.y + (dx / m) * 4)
      ctx.lineTo(p.x + (dy / m) * 4, p.y - (dx / m) * 4)
      ctx.stroke()
    }
  } else {
    ctx.strokeStyle = `rgba(${C.warm}, ${0.9 * alpha})`
    ctx.lineWidth = w * 0.85
    strokePath(ctx, pts, -0.02)
  }
}
// An origin: contours of its probability (1, 2, 3 σ), dotted; a sharp
// cross only when it's near certain; otherwise a cloud of possible points.
function drawOrigin(ctx: CanvasRenderingContext2D, h: Hypothesis, alpha: number, warm: boolean, seed: number, label: string | null) {
  const colour = warm ? C.warm : C.cyan
  const cosl = Math.cos((h.lat * Math.PI) / 180) || 1
  for (const k of [1, 2, 3]) {
    const ring: Pt[] = []
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2
      ring.push(project(view, h.lon + (Math.cos(a) * h.sx * k) / cosl, h.lat + Math.sin(a) * h.sy * k))
    }
    ctx.strokeStyle = `rgba(${colour}, ${(0.75 - k * 0.18) * alpha * (0.35 + h.p)})`
    ctx.lineWidth = 0.6
    ctx.setLineDash(k === 1 ? [1.5, 2] : [1, 3 + k])
    strokePath(ctx, ring)
  }
  ctx.setLineDash([])
  const c = project(view, h.lon, h.lat)
  if (c.depth < 0) return
  if (h.p >= 0.75 && !warm) {
    ctx.strokeStyle = `rgba(${ICE ? C.ink : C.white}, ${0.95 * alpha})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(c.x - 5, c.y); ctx.lineTo(c.x + 5, c.y)
    ctx.moveTo(c.x, c.y - 5); ctx.lineTo(c.x, c.y + 5)
    ctx.stroke()
  } else {
    const r = rng(seed)
    ctx.fillStyle = `rgba(${colour}, ${0.75 * alpha})`
    const n = Math.round(12 + (1 - h.p) * 40)
    for (let i = 0; i < n; i++) {
      const g1 = Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r())
      const g2 = Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r())
      const p = project(view, h.lon + (g1 * h.sx) / cosl, h.lat + g2 * h.sy)
      if (p.depth > 0) ctx.fillRect(p.x, p.y, 1.1, 1.1)
    }
  }
  if (label) {
    ctx.fillStyle = `rgba(${warm ? C.warm : C.ink}, ${0.85 * alpha})`
    ctx.font = `9px ${MONO}`
    mapText(ctx, label, c.x + 8, c.y - 6)
  }
}

// The radial index: every case's relay clusters as spokes round a ring.
// Ice: larger, in the pale space top right, every relay's code round it.
const RADIAL = ICE ? { r0: 44, r1: 150 } : { r0: 30, r1: 96 }
function radialCentre() {
  return ICE ? { x: width - 300, y: 245 } : { x: width - 190, y: 170 }
}
function radialSlots() {
  const slots: { e: number, v: number, label?: string }[] = []
  events.value.forEach((ev, e) => {
    if (ICE) {
      // Two spokes a relay, its code on the first.
      ev.targets.forEach((t, i) => {
        slots.push({ e, v: ev.volumes[(i * 2) % ev.volumes.length]!, label: data?.nodes[t]?.id })
        slots.push({ e, v: ev.volumes[(i * 2 + 1) % ev.volumes.length]! })
      })
    } else for (const v of ev.volumes) slots.push({ e, v })
    slots.push({ e: -1, v: 0 }, { e: -1, v: 0 })
  })
  return slots
}

function isWarm(ev: CampaignEvent) {
  return shownLayer(ev).routes.some((r) => r.cert === 'contradictory')
}

function drawEvents() {
  const canvas = eventCanvas.value
  if (!canvas || !data) return
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const focus = selected.value ?? hovered.value
  const nodes = data.nodes
  const z = view.scale
  const involved = new Set<number>(focus === null ? [] : events.value[focus]!.targets)

  // Relays' micro-detections, then the relays.
  for (const [k, node] of nodes.entries()) {
    const lit = focus === null || involved.has(k)
    ctx.fillStyle = `rgba(${C.cyan}, ${lit ? (focus === null ? 0.32 : 0.7) : 0.06})`
    const m = node.micro
    for (let i = 0; i < m.length; i += 2) {
      const p = project(view, m[i]!, m[i + 1]!)
      if (p.depth > 0) ctx.fillRect(p.x, p.y, 0.9, 0.9)
    }
    const c = project(view, node.lon, node.lat)
    if (c.depth < 0) continue
    ctx.fillStyle = `rgba(${C.ink}, ${lit ? 0.9 : 0.2})`
    ctx.fillRect(c.x - 1.5, c.y - 1.5, 3, 3)
    if ((z > 1.9 && focus === null) || (focus !== null && involved.has(k))) {
      ctx.font = `8.5px ${MONO}`
      ctx.fillStyle = `rgba(${C.pale}, ${lit ? 0.85 : 0.3})`
      mapText(ctx, node.id, c.x + 5, c.y + 3)
      if (z > 3 || (focus !== null && involved.has(k))) {
        ctx.fillStyle = `rgba(${C.pale}, 0.5)`
        mapText(ctx, `${Math.abs(node.lat).toFixed(2)}°${node.lat >= 0 ? 'N' : 'S'} ${Math.abs(node.lon).toFixed(2)}°${node.lon >= 0 ? 'E' : 'W'}`, c.x + 5, c.y + 13)
      }
    }
  }

  // Routes and origins, the focused case last (on top).
  const order = events.value.map((_, e) => e).sort((a, b) => (a === focus ? 1 : b === focus ? -1 : 0))
  for (const e of order) {
    const ev = events.value[e]!
    const lay = shownLayer(ev)
    const origins = shownOrigins(ev)
    const isFocus = focus === e
    const alpha = focus === null ? 0.4 : isFocus ? 1 : 0.07
    // Mid-switch, the routes fade through.
    const switchFade = layerT < 1 ? Math.abs(layerT - 0.5) * 2 : 1
    const warm = isWarm(ev)
    for (const [i, route] of lay.routes.entries()) {
      const o = origins[route.from]
      const t = nodes[route.target]!
      const pts = routeArc([o.lon, o.lat], [t.lon, t.lat])
      drawRoute(ctx, pts, route.cert, alpha * switchFade, e * 31 + i, isFocus)
      if (isFocus && selected.value === e) {
        const mid = pts[Math.floor(pts.length / 2)]!
        if (mid.depth > 0) {
          ctx.font = `8px ${MONO}`
          ctx.fillStyle = route.cert === 'contradictory' ? `rgba(${C.warm}, 0.9)` : `rgba(${C.pale}, 0.8)`
          mapText(ctx, route.cert === 'missing' ? 'NO RECORD' : route.cert.toUpperCase(), mid.x + 4, mid.y - 4)
        }
      }
    }
    for (const [h, o] of origins.entries()) {
      if (o.p < 0.06) continue
      const label = isFocus || z > 2.4 ? `${h === 0 ? 'H1' : 'H2'} · p ${o.p.toFixed(2)}` : null
      drawOrigin(ctx, o, alpha * (h === 0 ? 1 : 0.8), warm && h === 1, e * 97 + h, label)
    }
    // Its id by its main origin.
    const c = project(view, origins[0].lon, origins[0].lat)
    if (c.depth > 0 && (focus === null || isFocus)) {
      ctx.font = `9px ${MONO}`
      ctx.fillStyle = warm ? `rgba(${C.warm}, ${isFocus ? 1 : 0.8})` : `rgba(${C.ink}, ${isFocus ? 1 : 0.7})`
      mapText(ctx, ev.id, c.x + 8, c.y + 12)
    }
  }

  // The radial index.
  const rc = radialCentre()
  const slots = radialSlots()
  const step = (Math.PI * 2) / slots.length
  ctx.lineWidth = 0.7
  slots.forEach((slot, k) => {
    if (slot.e < 0) return
    const a = -Math.PI / 2 + k * step
    const ev = events.value[slot.e]!
    const lit = focus === null || focus === slot.e
    const colour = isWarm(ev) ? C.warm : focus === slot.e ? C.cyan : ICE ? C.ink : C.ice
    ctx.strokeStyle = `rgba(${colour}, ${lit ? 0.75 : 0.15})`
    const r1 = RADIAL.r0 + slot.v * (RADIAL.r1 - RADIAL.r0)
    ctx.beginPath()
    ctx.moveTo(rc.x + Math.cos(a) * RADIAL.r0, rc.y + Math.sin(a) * RADIAL.r0)
    ctx.lineTo(rc.x + Math.cos(a) * r1, rc.y + Math.sin(a) * r1)
    ctx.stroke()
    if (slot.label) {
      // Its relay's code, a thin line out to it, as the reference's names.
      ctx.save()
      ctx.strokeStyle = `rgba(${ICE ? C.ink : C.ice}, ${lit ? 0.18 : 0.06})`
      ctx.lineWidth = 0.4
      ctx.beginPath()
      ctx.moveTo(rc.x + Math.cos(a) * (r1 + 2), rc.y + Math.sin(a) * (r1 + 2))
      ctx.lineTo(rc.x + Math.cos(a) * (RADIAL.r1 + 6), rc.y + Math.sin(a) * (RADIAL.r1 + 6))
      ctx.stroke()
      ctx.translate(rc.x + Math.cos(a) * (RADIAL.r1 + 9), rc.y + Math.sin(a) * (RADIAL.r1 + 9))
      const flip = Math.cos(a) < 0
      ctx.rotate(flip ? a + Math.PI : a)
      ctx.textAlign = flip ? 'right' : 'left'
      ctx.font = `7px ${MONO}`
      ctx.fillStyle = `rgba(${C.ink}, ${lit ? 0.75 : 0.2})`
      ctx.fillText(slot.label, 0, 2.5)
      ctx.restore()
      ctx.lineWidth = 0.7
    }
  })
  ctx.strokeStyle = `rgba(${C.pale}, 0.3)`
  ctx.lineWidth = 0.5
  for (const rr of [RADIAL.r0, RADIAL.r1 + 2]) {
    ctx.setLineDash(rr === RADIAL.r0 ? [] : [1, 3])
    ctx.beginPath()
    ctx.arc(rc.x, rc.y, rr, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.setLineDash([])
  // Case ids round it, at each group's middle.
  ctx.font = `8px ${MONO}`
  let k0 = 0
  events.value.forEach((ev, e) => {
    const mid = k0 + ev.volumes.length / 2
    k0 += ev.volumes.length + 2
    const a = -Math.PI / 2 + mid * step
    const lit = focus === null || focus === e
    ctx.save()
    const out = RADIAL.r1 + (ICE ? 52 : 10)
    ctx.translate(rc.x + Math.cos(a) * out, rc.y + Math.sin(a) * out)
    const flip = Math.cos(a) < 0
    ctx.rotate(flip ? a + Math.PI : a)
    ctx.textAlign = flip ? 'right' : 'left'
    ctx.fillStyle = isWarm(ev) ? `rgba(${C.warm}, ${lit ? 0.95 : 0.3})` : `rgba(${ICE ? C.ink : C.ice}, ${lit ? 0.8 : 0.25})`
    ctx.fillText(ev.id, 0, 3)
    ctx.restore()
  })
}

// ---- Redraws ----
let worldDirty = true
let frame = 0
function requestDraw(worldToo = false) {
  if (worldToo) worldDirty = true
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    if (worldDirty) {
      drawWorld()
      if (WORLD && reducedMotion()) drawLand(landStart + 9000)
      worldDirty = false
    }
    drawEvents()
  })
}
function resize() {
  const el = root.value
  if (!el || !worldCanvas.value || !eventCanvas.value) return
  ratio = Math.min(2, window.devicePixelRatio || 1)
  width = el.clientWidth
  height = el.clientHeight
  for (const c of [worldCanvas.value, eventCanvas.value, landCanvas.value]) {
    if (!c) continue
    c.width = Math.round(width * ratio)
    c.height = Math.round(height * ratio)
  }
  layoutView()
  if (ICE) buildTangles()
  updateScale()
  requestDraw(true)
}
function updateScale() {
  // 1 : n, a pixel at 96 dpi (0.2646 mm) against the ground it covers at
  // the view's centre.
  const metresPerPx = 6371000 / view.r
  const n = metresPerPx / 0.0002646
  scaleLabel.value = `1:${n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}K`}`
  zoomLevel.value = view.scale
}

// ---- Interaction ----
let drag: { x: number, y: number, lon: number, lat: number, moved: boolean } | null = null
function onPointerDown(e: PointerEvent) {
  drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat, moved: false }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function local(e: { clientX: number, clientY: number }) {
  const box = root.value!.getBoundingClientRect()
  return { x: e.clientX - box.left, y: e.clientY - box.top }
}
function onPointerMove(e: PointerEvent) {
  const { x, y } = local(e)
  if (drag) {
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
    const k = degPerPx()
    view.lon = drag.lon - dx * k
    view.lat = Math.max(-70, Math.min(70, drag.lat - dy * k))
    stopFly()
    requestDraw(true)
  }
  const ll = invert(view, x, y)
  cursor.value = ll ? { lon: ll[0], lat: ll[1], cov: coverage(ll[0], ll[1]) } : null
  const hit = hitTest(x, y)
  if (hit !== hovered.value) {
    hovered.value = hit
    requestDraw()
  }
}
function onPointerUp(e: PointerEvent) {
  // (Pressed on the typography: not the map's.)
  if (!drag) return
  const wasDrag = drag.moved
  drag = null
  if (wasDrag) return
  const { x, y } = local(e)
  const hit = hitTest(x, y)
  select(hit)
}
function onLeave() {
  cursor.value = null
  if (hovered.value !== null) {
    hovered.value = null
    requestDraw()
  }
}
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const { x, y } = local(e)
  const before = invert(view, x, y)
  view.scale = Math.max(0.7, Math.min(8, view.scale * Math.exp(-e.deltaY * 0.0015)))
  view.r = baseR * view.scale
  const after = invert(view, x, y)
  if (before && after) {
    view.lon += before[0] - after[0]
    view.lat = Math.max(-70, Math.min(70, view.lat + before[1] - after[1]))
  }
  stopFly()
  updateScale()
  requestDraw(true)
}
// A case under (x, y): its origins, its relays, or its spokes in the index.
function hitTest(x: number, y: number): number | null {
  if (!data) return null
  let best: number | null = null
  let bestD = 14
  events.value.forEach((ev, e) => {
    for (const o of shownOrigins(ev)) {
      if (o.p < 0.06) continue
      const p = project(view, o.lon, o.lat)
      if (p.depth < 0) continue
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bestD) { bestD = d; best = e }
    }
  })
  if (best !== null) return best
  // The index.
  const rc = radialCentre()
  const d = Math.hypot(x - rc.x, y - rc.y)
  if (d > RADIAL.r0 - 4 && d < RADIAL.r1 + (ICE ? 70 : 26)) {
    const slots = radialSlots()
    let a = Math.atan2(y - rc.y, x - rc.x) + Math.PI / 2
    if (a < 0) a += Math.PI * 2
    const slot = slots[Math.floor((a / (Math.PI * 2)) * slots.length) % slots.length]
    if (slot && slot.e >= 0) return slot.e
  }
  // A relay: the first case through it.
  for (const [k, node] of data.nodes.entries()) {
    const p = project(view, node.lon, node.lat)
    if (p.depth > 0 && Math.hypot(p.x - x, p.y - y) < 6) {
      const e = events.value.findIndex((ev) => ev.targets.includes(k))
      if (e >= 0) return e
    }
  }
  return null
}

// Selecting a case turns the globe to it (its main origin a little left of
// the dossier), not too far out.
let fly = 0
function stopFly() {
  cancelAnimationFrame(fly)
  fly = 0
}
function flyTo(lon: number, lat: number, scale: number) {
  stopFly()
  const from = { lon: view.lon, lat: view.lat, scale: view.scale }
  let dl = lon - from.lon
  if (dl > 180) dl -= 360
  if (dl < -180) dl += 360
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1100)
    const k = 1 - (1 - t) ** 3
    view.lon = from.lon + dl * k
    view.lat = from.lat + (lat - from.lat) * k
    view.scale = from.scale + (scale - from.scale) * k
    view.r = baseR * view.scale
    updateScale()
    requestDraw(true)
    if (t < 1) fly = requestAnimationFrame(step)
  }
  fly = requestAnimationFrame(step)
}
function select(e: number | null) {
  selected.value = e
  if (e !== null) {
    const o = shownOrigins(events.value[e]!)[0]
    // Its origin brought up the screen: the view's centre is below it (the
    // globe's centre is under the screen's foot).
    if (ICE) flyTo(o.lon, o.lat, Math.max(view.scale, 1.6))
    else flyTo(o.lon, o.lat - 26 / Math.max(1, view.scale), Math.max(view.scale, 1.3))
  }
  requestDraw()
}
let switchFrame = 0
function setLayer(key: LayerKey) {
  if (key === layer.value) return
  layerFrom = layer.value
  layer.value = key
  layerT = 0
  cancelAnimationFrame(switchFrame)
  const start = performance.now()
  const step = (now: number) => {
    layerT = Math.min(1, (now - start) / 900)
    requestDraw()
    if (layerT < 1) switchFrame = requestAnimationFrame(step)
  }
  switchFrame = requestAnimationFrame(step)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') select(null)
  const n = Number(e.key)
  if (n >= 1 && n <= LAYERS.length) setLayer(LAYERS[n - 1]!.key)
}

// ---- The dossier ----
const dossier = computed(() => {
  if (selected.value === null) return null
  const ev = events.value[selected.value]!
  const lay = ev.layers[layer.value]
  const [h1, h2] = lay.origins
  const counts = { verified: 0, unconfirmed: 0, missing: 0, contradictory: 0 } as Record<Certainty, number>
  for (const r of lay.routes) counts[r.cert]++
  const unresolved = Math.max(0, 1 - h1.p - h2.p)
  return { ev, lay, h1, h2, counts, unresolved }
})
const coordLabel = (lon: number, lat: number) => `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`
const CERT_MARK: Record<Certainty, string> = { verified: '━', unconfirmed: '┅', missing: '╌ ╌', contradictory: '═' }

onMounted(async () => {
  world = await loadWorld()
  // Built in the next frame, so the splash's own arrival isn't held.
  await new Promise((r) => setTimeout(r, 30))
  data = makeSynthetic(world)
  events.value = data.events
  ready.value = true
  await nextTick()
  resize()
  document.fonts?.ready.then(() => requestDraw(true))
  window.addEventListener('resize', resize)
  window.addEventListener('keydown', onKey)
  if (WORLD) {
    landStart = performance.now()
    readLandColors()
    if (!reducedMotion()) landFrame = requestAnimationFrame(landLoop)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  window.removeEventListener('keydown', onKey)
  cancelAnimationFrame(frame)
  cancelAnimationFrame(switchFrame)
  cancelAnimationFrame(landFrame)
  stopFly()
})
</script>

<template>
  <div
    ref="root"
    class="cartography"
    :class="{ 'is-ready': ready, 'is-focus': selected !== null || hovered !== null, 'is-ice': ICE }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onLeave"
    @wheel="onWheel"
  >
    <canvas v-if="WORLD" ref="landCanvas" class="cartography-land" aria-hidden="true" />
    <canvas ref="worldCanvas" class="cartography-world" aria-hidden="true" />
    <canvas ref="eventCanvas" class="cartography-events" aria-hidden="true" />

    <!-- Title: a caption on the instrument, not a headline. -->
    <header class="carto-head" @pointerdown.stop>
      <p class="carto-kicker">DE.CO.DE · FIELD STUDY 01</p>
      <h2 class="carto-title">Mapping uncertainty</h2>
      <p class="carto-sub">Spotting deepfake campaigns: the more precisely a campaign is mapped, the more its gaps show.</p>
      <p class="carto-warning">
        <span>Synthetic demonstration data.</span>
        Every case, relay, route, origin and probability on this map is generated for this prototype. None is a verified investigation. {{ WORLD ? 'The land is a stylised pixel world, not real coastlines.' : 'Only the coastlines are real.' }}
      </p>
    </header>

    <!-- Index caption, under the radial index (drawn on the canvas). -->
    <p class="carto-index-caption">
      Index · {{ events.length }} synthetic cases<br>
      spokes: posts per relay cluster
    </p>

    <!-- Legend: how certainty is drawn. -->
    <dl class="carto-legend" @pointerdown.stop>
      <div>
        <dt><svg viewBox="0 0 44 8"><line x1="0" y1="4" x2="44" y2="4" class="lg-verified" /></svg></dt>
        <dd>Verified relation</dd>
      </div>
      <div>
        <dt><svg viewBox="0 0 44 8"><path d="M0 4h5M9 3.4h7M19 4.6h3M26 4h8M38 3.6h6" class="lg-unconfirmed" /></svg></dt>
        <dd>Unconfirmed, fragmentary</dd>
      </div>
      <div>
        <dt><svg viewBox="0 0 44 8"><path d="M0 4h12M12 0v8M32 0v8M32 4h12" class="lg-missing" /></svg></dt>
        <dd>Missing link, no record</dd>
      </div>
      <div>
        <dt><svg viewBox="0 0 44 8"><path d="M0 2.5h44M0 5.5h44" class="lg-contradictory" /></svg></dt>
        <dd>Contradictory evidence</dd>
      </div>
      <div>
        <dt><svg viewBox="0 0 44 14"><ellipse cx="22" cy="7" rx="6" ry="3" class="lg-origin" /><ellipse cx="22" cy="7" rx="13" ry="5.5" class="lg-origin is-far" /><path d="M19 7h6M22 4v6" class="lg-cross" /></svg></dt>
        <dd>Origin: certain (cross) or a probability cloud</dd>
      </div>
      <div>
        <dt><svg viewBox="0 0 44 14"><circle cx="22" cy="7" r="6" class="lg-lacuna" /></svg></dt>
        <dd>Lacuna: no record at all</dd>
      </div>
      <div class="carto-gradients">
        <div><i class="is-density" /><span>Record density (synthetic)</span></div>
        <div><i class="is-detections" /><span>Detections along coasts (synthetic)</span></div>
      </div>
    </dl>

    <!-- Evidence layers. -->
    <nav class="carto-layers" aria-label="Evidence layer" @pointerdown.stop>
      <span class="carto-layers-label">Evidence layer</span>
      <button
        v-for="(l, i) in LAYERS"
        :key="l.key"
        type="button"
        :class="{ 'is-on': layer === l.key }"
        :title="l.note"
        @click="setLayer(l.key)"
      >
        <span class="carto-key">{{ i + 1 }}</span>{{ l.label }}
      </button>
    </nav>

    <!-- Readout. -->
    <div class="carto-readout" aria-live="off">
      <template v-if="cursor">
        <span>{{ coordLabel(cursor.lon, cursor.lat) }}</span>
        <span>record density {{ cursor.cov.toFixed(2) }}</span>
      </template>
      <span v-else>— off the globe —</span>
      <span>scale {{ scaleLabel }} · ×{{ zoomLevel.toFixed(1) }}</span>
      <span class="carto-hint">drag · scroll · hover · click a case · 1–3 layers · esc</span>
    </div>

    <!-- The selected case. -->
    <aside v-if="dossier" class="carto-dossier" @pointerdown.stop>
      <p class="carto-dossier-id">
        <span :class="{ 'is-warm': dossier.counts.contradictory }">{{ dossier.ev.id }}</span>
        · {{ dossier.ev.kind }} · first seen {{ dossier.ev.first }}
        <button type="button" class="carto-close" aria-label="Close" @click="select(null)">×</button>
      </p>
      <h3>{{ dossier.ev.title }}</h3>
      <p class="carto-dossier-note">Synthetic case. Read through: {{ LAYERS.find((l) => l.key === layer)?.label }}.</p>

      <h4>Possible origins</h4>
      <ul class="carto-rows">
        <li><span>H1</span><span>{{ coordLabel(dossier.h1.lon, dossier.h1.lat) }}</span><span>p {{ dossier.h1.p.toFixed(2) }}</span></li>
        <li><span>H2</span><span>{{ coordLabel(dossier.h2.lon, dossier.h2.lat) }}</span><span>p {{ dossier.h2.p.toFixed(2) }}</span></li>
        <li class="is-soft"><span>—</span><span>unresolved</span><span>p {{ dossier.unresolved.toFixed(2) }}</span></li>
      </ul>

      <h4>Circulation · {{ dossier.lay.routes.length }} routes</h4>
      <ul class="carto-rows">
        <li v-for="(r, i) in dossier.lay.routes" :key="i" :class="`is-${r.cert}`">
          <span>{{ CERT_MARK[r.cert] }}</span>
          <span>H{{ r.from + 1 }} → {{ data?.nodes[r.target]?.id }}</span>
          <span>{{ r.cert === 'missing' ? 'no record' : r.cert }}</span>
        </li>
      </ul>

      <h4>Evidence</h4>
      <ul class="carto-rows is-evidence">
        <li v-for="item in dossier.lay.evidence" :key="item.k" :class="`is-${item.cert}`">
          <span>{{ item.k }}</span><span>{{ item.v }}</span>
        </li>
      </ul>
      <p class="carto-dossier-note">Switch the evidence layer (1–3): the origins move.</p>
    </aside>
  </div>
</template>

<style scoped>
.cartography {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #04080b;
  color: rgb(206, 226, 238);
  font-family: var(--font-mono);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
  opacity: 0;
  transition: opacity 1.2s ease;
}

.cartography.is-ready {
  opacity: 1;
}

.cartography canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Something isolated: the world steps back. */
.cartography-world {
  transition: opacity 0.5s ease;
}

.cartography.is-focus :is(.cartography-world, .cartography-land) {
  opacity: 0.55;
}

.cartography-land {
  transition: opacity 0.5s ease;
}

.carto-head,
.carto-legend,
.carto-layers,
.carto-readout,
.carto-dossier,
.carto-index-caption {
  position: absolute;
  z-index: 2;
  font-size: 10px;
  line-height: 1.45;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.carto-head {
  top: 64px;
  left: 28px;
  width: 330px;
  cursor: default;
}

.carto-kicker {
  margin: 0 0 10px;
  color: rgba(150, 190, 214, 0.8);
}

.carto-title {
  margin: 0 0 8px;
  font-family: var(--font-text);
  font-weight: 700;
  font-size: 30px;
  line-height: 0.95;
  letter-spacing: -0.01em;
  color: rgb(240, 246, 250);
}

.carto-sub {
  margin: 0 0 14px;
  text-transform: none;
  font-size: 11px;
  letter-spacing: 0.01em;
  color: rgba(206, 226, 238, 0.85);
}

.carto-warning {
  margin: 0;
  padding-left: 10px;
  border-left: 1px solid rgb(255, 92, 54);
  text-transform: none;
  letter-spacing: 0.01em;
  color: rgba(206, 226, 238, 0.7);
}

.carto-warning span {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(255, 92, 54);
}

.carto-index-caption {
  top: 296px;
  right: 110px;
  margin: 0;
  text-align: center;
  color: rgba(150, 190, 214, 0.6);
  pointer-events: none;
}

.carto-legend {
  left: 28px;
  bottom: 28px;
  display: grid;
  gap: 5px;
  margin: 0;
  cursor: default;
}

.carto-legend div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.carto-legend dt {
  width: 44px;
  line-height: 0;
}

.carto-legend svg {
  width: 44px;
  height: auto;
  overflow: visible;
  fill: none;
}

.carto-legend dd {
  margin: 0;
  color: rgba(206, 226, 238, 0.75);
}

.lg-verified { stroke: rgb(240, 246, 250); stroke-width: 1; }
.lg-unconfirmed { stroke: rgb(64, 200, 240); stroke-width: 0.9; }
.lg-missing { stroke: rgb(206, 226, 238); stroke-width: 0.8; }
.lg-contradictory { stroke: rgb(255, 92, 54); stroke-width: 0.8; }
.lg-origin { stroke: rgb(64, 200, 240); stroke-width: 0.7; stroke-dasharray: 1.5 2; }
.lg-origin.is-far { stroke-dasharray: 1 4; opacity: 0.6; }
.lg-cross { stroke: rgb(240, 246, 250); stroke-width: 1; }
.lg-lacuna { stroke: rgb(150, 190, 214); stroke-width: 0.7; stroke-dasharray: 1 3; fill: #04080b; }

.carto-layers {
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 18px;
}

.carto-layers-label {
  color: rgba(150, 190, 214, 0.6);
}

.carto-layers button {
  padding: 0 0 3px;
  border: 0;
  border-bottom: 1px solid transparent;
  background: none;
  color: rgba(206, 226, 238, 0.6);
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}

.carto-layers button:hover {
  color: rgb(240, 246, 250);
}

.carto-layers button.is-on {
  color: rgb(64, 200, 240);
  border-bottom-color: rgb(64, 200, 240);
}

.carto-key {
  margin-right: 6px;
  opacity: 0.6;
}

.carto-readout {
  left: 50%;
  bottom: 52px;
  transform: translateX(-50%);
  display: flex;
  gap: 18px;
  white-space: nowrap;
  color: rgba(206, 226, 238, 0.75);
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.carto-hint {
  color: rgba(150, 190, 214, 0.45);
}

.carto-dossier {
  top: 318px;
  right: 28px;
  width: 300px;
  max-height: calc(100% - 318px - 90px);
  overflow-y: auto;
  padding: 0 0 0 12px;
  border-left: 1px solid rgba(150, 190, 214, 0.35);
  background: linear-gradient(90deg, rgba(4, 8, 11, 0.82), rgba(4, 8, 11, 0.6));
  cursor: default;
  user-select: text;
}

.carto-dossier-id {
  position: relative;
  margin: 0 0 6px;
  color: rgba(150, 190, 214, 0.8);
}

.carto-dossier-id .is-warm {
  color: rgb(255, 92, 54);
}

.carto-close {
  position: absolute;
  top: -3px;
  right: 0;
  padding: 0 4px;
  border: 0;
  background: none;
  color: rgba(206, 226, 238, 0.8);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.carto-dossier h3 {
  margin: 0 0 4px;
  font-family: var(--font-text);
  font-weight: 700;
  font-size: 15px;
  line-height: 1.15;
  letter-spacing: 0;
  text-transform: none;
  color: rgb(240, 246, 250);
}

.carto-dossier h4 {
  margin: 12px 0 4px;
  font-weight: 400;
  color: rgba(150, 190, 214, 0.65);
}

.carto-dossier-note {
  margin: 0;
  text-transform: none;
  color: rgba(150, 190, 214, 0.65);
}

.carto-rows {
  margin: 0;
  padding: 0;
  list-style: none;
  font-variant-numeric: tabular-nums;
}

.carto-rows li {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 8px;
  padding: 2px 0;
  border-top: 1px solid rgba(150, 190, 214, 0.12);
}

.carto-rows.is-evidence li {
  grid-template-columns: 110px 1fr;
  text-transform: none;
}

.carto-rows .is-soft { color: rgba(150, 190, 214, 0.6); }
.carto-rows .is-verified { color: rgb(240, 246, 250); }
.carto-rows .is-unconfirmed { color: rgb(64, 200, 240); }
.carto-rows .is-missing { color: rgba(150, 190, 214, 0.6); }
.carto-rows .is-contradictory { color: rgb(255, 92, 54); }

/* ---- Ice (/?splash=ice): navy type on the pale ground. ---- */
.cartography.is-ice {
  background: #c3d6df;
  color: rgb(12, 26, 46);
}

.cartography.is-ice.is-focus .cartography-world {
  opacity: 0.88;
}

.is-ice .carto-kicker,
.is-ice .carto-index-caption,
.is-ice .carto-layers-label,
.is-ice .carto-hint,
.is-ice .carto-dossier-note,
.is-ice .carto-dossier h4,
.is-ice .carto-dossier-id {
  color: rgba(22, 40, 64, 0.62);
}

.is-ice .carto-title,
.is-ice .carto-dossier h3 {
  color: rgb(12, 26, 46);
}

.is-ice .carto-sub,
.is-ice .carto-warning,
.is-ice .carto-legend dd,
.is-ice .carto-readout,
.is-ice .carto-layers button,
.is-ice .carto-close {
  color: rgba(12, 26, 46, 0.82);
}

.is-ice .carto-warning,
.is-ice .carto-warning span,
.is-ice .carto-dossier-id .is-warm,
.is-ice .carto-rows .is-contradictory {
  border-color: rgb(240, 74, 36);
}

.is-ice .carto-warning span,
.is-ice .carto-dossier-id .is-warm,
.is-ice .carto-rows .is-contradictory {
  color: rgb(220, 60, 24);
}

.is-ice .carto-layers button:hover {
  color: rgb(12, 26, 46);
}

.is-ice .carto-layers button.is-on {
  color: rgb(40, 66, 240);
  border-bottom-color: rgb(40, 66, 240);
}

/* The readout and the layers sit on the dark sea: pale there. */
.is-ice .carto-readout,
.is-ice .carto-layers,
.is-ice .carto-layers button,
.is-ice .carto-layers-label,
.is-ice .carto-hint {
  color: rgba(226, 236, 242, 0.8);
}

.is-ice .carto-layers button.is-on {
  color: rgb(120, 146, 255);
  border-bottom-color: rgb(120, 146, 255);
}

.is-ice .carto-dossier {
  border-left-color: rgba(22, 40, 64, 0.35);
  background: linear-gradient(90deg, rgba(205, 222, 230, 0.92), rgba(205, 222, 230, 0.75));
}

.is-ice .carto-rows li {
  border-top-color: rgba(22, 40, 64, 0.15);
}

.is-ice .carto-rows .is-soft,
.is-ice .carto-rows .is-missing { color: rgba(22, 40, 64, 0.55); }
.is-ice .carto-rows .is-verified { color: rgb(12, 26, 46); }
.is-ice .carto-rows .is-unconfirmed { color: rgb(40, 66, 240); }

/* Legend: its line samples on a strip of sea, as they're drawn. */
.is-ice .carto-legend dt {
  padding: 4px 3px;
  background: #0b141e;
}

.is-ice .lg-unconfirmed,
.is-ice .lg-origin { stroke: rgb(52, 82, 255); }
.is-ice .lg-lacuna { fill: #d3e2e9; stroke: rgb(22, 40, 64); }

.cartography:not(.is-ice) .carto-gradients {
  display: none;
}

.is-ice .carto-gradients {
  display: grid;
  gap: 5px;
  margin-top: 6px;
}

.carto-gradients div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.carto-gradients i {
  display: block;
  width: 50px;
  height: 9px;
}

.carto-gradients .is-density {
  background: linear-gradient(90deg, #0b141e, #5d6b77 50%, #e6eef2);
}

.carto-gradients .is-detections {
  background: linear-gradient(90deg, #0b141e, #3452ff 60%, #d2deff);
}

/* Ice: every block of type on a strip of pale paper (it may lie on the
   dark sea), as the splash's headline strips. */
.is-ice :is(.carto-head, .carto-legend, .carto-index-caption) {
  padding: 10px 12px;
  background: rgba(214, 228, 236, 0.92);
}

.is-ice .carto-head {
  top: 56px;
  left: 18px;
}

.is-ice .carto-legend {
  left: 18px;
  bottom: 18px;
}

.is-ice .carto-index-caption {
  top: auto;
  bottom: 120px;
  right: 28px;
  padding: 6px 10px;
}

.is-ice :is(.carto-layers, .carto-readout) {
  padding: 5px 10px;
  background: rgba(11, 20, 30, 0.88);
}

.is-ice .carto-layers {
  bottom: 18px;
}

.is-ice .carto-readout {
  bottom: 50px;
}
</style>
