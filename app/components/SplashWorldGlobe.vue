<script setup lang="ts">
// basics,world (22 Nov 2026): the world SVG (public/countries/wolrd.svg, as
// cells in app/data/worldCells.json, scripts/world-cells.mjs) put on a sphere
// turning in 3D. Its disc is the front hemisphere; a mirrored copy can make
// the back, so the globe is never empty on one side. Each shape (a country,
// or a region of a continent) in one of basics' looks (dots, rings, halftone,
// outline, hatch: the "trame") and a blend of two of the splash's country
// colours across it; the shapes come and go, cell by cell, never all at once.
// Everything set by `settings` (utils/worldGlobe.ts, its editor in Splash.vue).
import world from '~/data/worldCells.json'
import { type WorldSettings, type WorldShape, worldRandom, worldShapes, worldShown, worldRgb, worldColor, drawWorldMark, isMapProjection } from '~/utils/worldGlobe'
import { loadSilverMap, type SilverMapData } from '~/utils/silverMap'
import { drawWorldMap } from '~/utils/worldMap'

const props = defineProps<{
  /** The splash's country colours (hex, or var(--…) resolved here). */
  colors: string[]
  settings: WorldSettings
  /** The grid's box in the canvas (the splash's): the globe placed off it. */
  grid: { top: number, left: number, right: number, bottom: number, cols?: number, rows?: number } | null
  /** Dark mode: the settings' darkColors, if any. */
  dark?: boolean
  /** Shown (the splash past its logo): from then it fades in, slowly, over
   *  `settings.appear` s. Until then nothing's drawn. Default: at once. */
  visible?: boolean
}>()
let shownAt = 0 // when `visible` first held (ms, as `now`)

const canvas = ref<HTMLCanvasElement | null>(null)

const random = worldRandom

interface Point { x: number, y: number, z: number, shape: number, seed: number, mix: number, edge: boolean, dx: number, dy: number }
type Shape = WorldShape

// The cells on the unit sphere: x, y on the disc, z out of it. The back copy
// turned half round (x and z the other way), its shapes counted after.
const occupied = new Set(world.cells.map(([x, y, s]) => `${Math.round(x)},${Math.round(y)},${s}`))
const isEdge = (x: number, y: number, s: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !occupied.has(`${Math.round(x) + dx!},${Math.round(y) + dy!},${s}`))
const grain = random(977)
const points: Point[] = []
for (const copy of [0, 1]) {
  for (const [cx, cy, s] of world.cells as [number, number, number][]) {
    const x = cx / world.radius
    const y = cy / world.radius
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y))
    points.push({
      x: copy ? -x : x,
      y,
      z: copy ? -z : z,
      dx: copy ? -x : x,
      dy: y,
      shape: s + copy * world.shapes,
      seed: grain(),
      mix: Math.min(1, Math.max(0, 0.5 + 0.5 * Math.sin(cx * 0.21 + cy * 0.13 + s) + (grain() - 0.5) * 0.25)),
      edge: isEdge(cx, cy, s),
    })
  }
}

// Each shape's look, colours and cycle: drawn again when the seed, the looks
// or the colours allowed change.
const shapes = computed<Shape[]>(() => worldShapes(props.settings, world.shapes * 2, props.dark))
// The map lab's projections (22 Nov 2026): the pixel world from its real
// world (utils/worldMap.ts), a shape per country.
const mapData = shallowRef<SilverMapData | null>(null)
const mapShapes = computed<Shape[]>(() => worldShapes(props.settings, mapData.value?.names.length ?? 1, props.dark))
const MAP_INK: [number, number, number] = [95, 99, 104]
function loadMap() {
  if (mapData.value || !isMapProjection(props.settings.projection)) return
  loadSilverMap().then((data) => {
    mapData.value = data
    if (reduced()) draw(start + 9000)
  })
}

// Colours as rgb, `var(--…)` read off the page.
let rgb: [number, number, number][] = []
function readColors() {
  const el = canvas.value
  if (!el) return
  rgb = worldRgb(el, props.colors)
}

const shown = worldShown

let frame = 0
let width = 0
let height = 0
let start = 0
let angle = 0 // the turn so far (rad): kept when the speed changes
let cycle = 9 // the shapes' clock (s), at `pace`: kept when the pace changes
let last = 0
function draw(now: number) {
  const el = canvas.value
  const ctx = el?.getContext('2d')
  if (!el || !ctx) return
  if (!rgb.length) readColors()
  const s = props.settings
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
  cycle += dt * (s.pace ?? 1)
  const t = cycle
  last = now
  // 3D: the sphere turns. Without: the projection held (at `lon`), the
  // picture turning flat on itself instead (in the screen's plane), a turn
  // per `turn` seconds.
  // Turning as it fades in (22 Nov 2026), from when it's shown; not before.
  if (props.visible !== false && !shownAt) shownAt = now
  if (s.turn && props.visible !== false) angle += (dt / s.turn) * Math.PI * 2
  const view = (s.rotate3d ? angle : 0) + (s.lon * Math.PI) / 180
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, width, height)

  if (isMapProjection(s.projection)) {
    if (!mapData.value) return loadMap()
    // The splash's grid, in this canvas (which may start lower).
    const top = el.getBoundingClientRect().top - (el.parentElement?.parentElement?.getBoundingClientRect().top ?? 0)
    const g = props.grid ? { ...props.grid, top: props.grid.top - top, bottom: props.grid.bottom - top } : { top: 0, left: 0, right: width, bottom: height }
    if (props.visible === false) return
    // (Reduced motion: drawn once, so whole.)
    const reveal = s.appear > 0 && !reduced() ? Math.min(1, (now - shownAt) / 1000 / s.appear) : 1
    // Fading in as a whole (22 Nov 2026: not dot by dot).
    ctx.globalAlpha = reveal * reveal * (3 - 2 * reveal)
    drawWorldMap({ ctx, data: mapData.value, s, lon: s.lon + (angle * 180) / Math.PI, width, height, grid: g, t, clock: (now - start) / 1000, reveal: reveal * reveal * (3 - 2 * reveal), shapes: mapShapes.value, rgb, ink: MAP_INK })
    return
  }

  const g = props.grid ?? { top: 0, left: 0, right: width, bottom: height }
  const gw = g.right - g.left
  const gh = g.bottom - g.top
  // Centred on the screen (not the grid, which the tab above pushes down),
  // then moved by x, y (in the grid's width, height).
  const top = el.getBoundingClientRect().top
  const ox = width / 2 + (s.x / 100) * gw
  const oy = window.innerHeight / 2 - top + (s.y / 100) * gh
  const R = (gh * s.size) / 2
  const cell = R / world.radius // a cell's step on the screen, at the front
  const cosT = Math.cos(view)
  const sinT = Math.sin(view)
  const tilt = (s.tilt * Math.PI) / 180
  const cosP = Math.cos(tilt)
  const sinP = Math.sin(tilt)
  const roll = (s.roll * Math.PI) / 180 + (s.rotate3d ? 0 : angle)
  const cosR = Math.cos(roll)
  const sinR = Math.sin(roll)
  const all = shapes.value
  const share = all.map((shape) => shown(shape, t, s.shown))
  const flat = s.projection === 'flat'
  const disc = s.projection === 'disc'
  const perspective = s.projection === 'perspective'
  // (Map projections, stereographic among them, are drawn above: drawWorldMap.)
  const stereo = (s.projection as string) === 'stereographic'
  // stereographic: the far side as far as `reach` past the horizon.
  const stereoFloor = -Math.sin((Math.min(85, Math.max(0, s.reach)) * Math.PI) / 180)

  // Back first, then the front over it (flat and disc: all one side).
  for (const front of flat || disc || stereo ? [true] : [false, true]) {
    for (const p of points) {
      if (!s.mirror && p.z < 0) continue
      if (disc && p.z < 0) continue
      const f = share[p.shape]!
      if (p.seed >= f) continue
      const shape = all[p.shape]!
      if (shape.look === 'outline' && !p.edge) continue

      let px: number
      let py: number
      let depth = 1
      let scale = 1
      let isFront = true
      if (disc) {
        // The SVG as drawn, turning in its plane.
        const c = Math.cos(view)
        const n = Math.sin(view)
        px = p.dx * c - p.dy * n
        py = p.dx * n + p.dy * c
      }
      else {
        const x1 = p.x * cosT + p.z * sinT
        const z1 = -p.x * sinT + p.z * cosT
        // Globe, perspective: squashed along its axis (the poles in, or
        // out), before it leans. Map projections: squashed on the screen.
        const py0 = flat || stereo ? p.y : p.y * s.squash
        const y2 = py0 * cosP - z1 * sinP
        const z2 = py0 * sinP + z1 * cosP
        if (flat) {
          // Longitude across (the map twice as wide as high), latitude up.
          px = Math.atan2(x1, z2) / Math.PI * 2
          py = Math.asin(Math.max(-1, Math.min(1, y2))) / (Math.PI / 2)
        }
        else if (stereo) {
          // From the point behind: the horizon at R, the centre at half,
          // everything scaled as much as it is spread (conformal).
          if (z2 < stereoFloor) continue
          const k = 1 / (1 + z2)
          px = x1 * k
          py = y2 * k
          scale = k
          depth = 1
        }
        else {
          isFront = z2 > 0
          if (isFront !== front) continue
          depth = Math.abs(z2)
          if (perspective) {
            const k = s.distance / (s.distance - z2)
            px = x1 * k
            py = y2 * k
            scale = k
          }
          else {
            px = x1
            py = y2
          }
        }
      }
      const rx = px * cosR - py * sinR
      const ry = (px * sinR + py * cosR) * (flat || stereo || disc ? s.squash : 1)
      const sx = ox + rx * R
      const sy = oy + ry * R

      // Smaller and fainter towards the rim (foreshortened), the far side faint.
      const rim = 1 - s.rim + s.rim * depth
      const size = scale * (flat || disc ? 1 : 0.45 + 0.55 * rim)
      const alpha = s.alpha * shape.alpha * (isFront ? rim : s.back)
      if (alpha <= 0.005) continue
      const color = worldColor(rgb, shape, p.mix, s.blend, alpha)
      drawWorldMark(ctx, shape.look, sx, sy, cell, size, s, color, shape.size, 0.5 + 0.5 * Math.sin(p.x * 9 + p.y * 7 + p.z * 5))
    }
  }
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Drawn 30 times a second, not 60: it turns a turn in minutes and its shapes
// come and go over seconds, nothing a frame in two would show (performance,
// 22 Nov 2026: half the splash's main thread went here).
const FRAME_MS = 1000 / 30
let drawnAt = 0
function loop(now: number) {
  frame = requestAnimationFrame(loop)
  if (now - drawnAt < FRAME_MS - 2) return
  drawnAt = now
  draw(now)
}

function resize() {
  const el = canvas.value
  if (!el) return
  const box = el.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  width = box.width
  height = box.height
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  readColors()
  if (reduced()) draw(start + 9000)
}

// Still (reduced motion): drawn again whenever a setting changes.
watch(() => props.settings.projection, loadMap)
watch(() => [props.settings, props.grid, props.colors], () => {
  readColors()
  if (reduced()) draw(start + 9000)
}, { deep: true })

let observer: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null
onMounted(() => {
  start = performance.now()
  loadMap()
  resize()
  observer = new ResizeObserver(resize)
  if (canvas.value) observer.observe(canvas.value)
  // The brand colour can change with the theme.
  themeObserver = new MutationObserver(readColors)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  if (!reduced()) frame = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  themeObserver?.disconnect()
})
</script>

<template>
  <canvas ref="canvas" class="splash-world-globe" aria-hidden="true" />
</template>

<style scoped>
.splash-world-globe {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
