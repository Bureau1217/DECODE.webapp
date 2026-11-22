<script setup lang="ts">
// /?splash=keywords: the splash's image row given over to the site's keywords
// on a sphere, turning slowly (after RUNOUT, runout.etienneledemay.fr). At
// rest the sphere is invisible: only the keywords, each framed in its
// category's colour (the row's chips, .splash-image-name, BADGE_COLORS).
//
// The sphere takes the grid's measure without fitting in it: centred on it,
// upright, its radius a whole number of rows, running past the grid's frame.
// Upright, a keyword only ever moves across: each is given a row of the grid.
// No lines at rest; a hovered keyword's links (its nearest few it shares a
// guide article with) fade in, in ink.
//
// A keyword coming round to the front builds itself in as the row's labels do
// (boxReveal, the chip filling in behind its letters); going round the back,
// it goes the same way out. Hovering one eases the turn to a stop, inks it,
// dims the rest and shows its visual beside it in the site's silver (the
// global #duotone-silver on img), captioned with its number as the row's
// images are; with the band (linkStrip), a line to one of its images instead.
// A click opens the keyword.
//
// stand (keywords,images,stand): a hovered keyword draws no lines to other
// keywords, only its line to an image, ending on that image's number (inked:
// .is-linked, Splash.vue), at its bottom left corner. Hovering an image of the band (image-hover, for
// Splash.vue to ease the band to a stop and show it in colour) links it to a
// few keywords (STAND_TERMS: its own, if its label is one, then the nearest).
// A click on a keyword or an image doesn't open anything: `pick`, for
// Splash.vue to turn the page dark.
import { BADGE_COLORS } from '~/utils/badgeColors'
import { boxReveal, unwrapBoxReveal } from '~/utils/boxReveal'

type Tag = {
  id: string
  // Its number, in the CMS's order (01, 02…).
  n: string
  title: string
  category: string
  color: string
  image: string | null
  // Unit vector on the sphere.
  v: [number, number, number]
  // Its lines: the keywords it shares an article with, nearest first.
  links: Tag[]
}
type Projected = { x: number, y: number, z: number }
// A chip's life: round the back (away), building in, there, going out.
type ChipState = 'away' | 'in' | 'on' | 'out'

// The splash's grid (Splash.vue's computeGrid), in px from the splash's corner.
// imageSize: the row's two image sizes (Splash.vue's CALM_HEIGHTS, each in
// its own SPAWN_RATIOS shape), the n-th's, in px.
const props = defineProps<{
  grid: { top: number, left: number, right: number, bottom: number, cellW: number, cellH: number } | null
  imageSize: (index: number) => { width: number, height: number }
  // With the band of images (keywords,images): a hovered keyword is linked to
  // one of them, by a line, instead of showing its own visual.
  linkStrip?: boolean
  // shelf,keywords: no keyword over the band of images (only its line to one).
  avoidBand?: boolean
  // keywords,images,stand: see above.
  stand?: boolean
  // shelf,keywords: the sphere wider (SPREAD_RADIUS of the grid's width), its
  // keywords only round the headline and its subtitle (within SPREAD_HUG of
  // them: in from the screen's far sides, gone earlier on the right, where
  // they turn out), no more in sight than SPREAD_MAX, as many on the left as
  // on the right.
  spread?: boolean
  // shelf,keywords: the lines (a keyword's and a hovered image's) end at the
  // image's top left corner instead of its number.
  anchorImage?: boolean
  // The sphere's radius, as a share of the grid's width (0.36 by default;
  // spread: SPREAD_RADIUS).
  radiusShare?: number
  // No more keywords in sight than this, as many on the left as on the right
  // (spread: SPREAD_MAX).
  maxShown?: number
}>()
const SPREAD_RADIUS = 0.5
const SPREAD_MAX = 4
// Round the headline and subtitle: this share of the grid's width out to
// each side, this many rows above and below.
const SPREAD_HUG = { x: 0.14, rows: 1.5 }
let hug: { left: number, top: number, right: number, bottom: number } | null = null
const emit = defineEmits<{
  // The band image under the pointer (its data-n), or null.
  'image-hover': [n: number | null]
  // A click on a keyword or an image, where (in the window).
  'pick': [at: { x: number, y: number }]
}>()
const intro = useSplashIntro()

const language = useLanguage()
const categories = useKeywordsPanelCache()
const { data: articles } = await useAsyncData('splash:keyword-articles', () =>
  useKqlCollection<{ id: string, concepts?: { id: string }[], themes?: { id: string }[], platforms?: { id: string }[] }>({
    query: "site.children.filterBy('intendedTemplate', 'default')",
    select: {
      id: true,
      concepts: { query: 'page.content.concepts.toPages', select: { id: true } },
      themes: { query: 'page.content.themes.toPages', select: { id: true } },
      platforms: { query: 'page.content.platforms.toPages', select: { id: true } },
    },
  }),
)

const canvas = ref<HTMLCanvasElement | null>(null)
// stand: over the band, the lines' last stretch inside the number's black box
// (in white), so they're seen to meet at one point in it; the canvas itself
// lies under the band.
const overlay = ref<HTMLCanvasElement | null>(null)
const tags = shallowRef<Tag[]>([])
const chipEls = new Map<string, HTMLElement>()
const hovered = shallowRef<Tag | null>(null)
// stand: the band image under the pointer (its wrapper), and the keywords
// it's linked to.
const hoveredImage = shallowRef<HTMLElement | null>(null)
let imageTerms: Tag[] = []
const STAND_TERMS = 3
watch(hoveredImage, (wrapper, before) => {
  before?.classList.remove('is-pointed')
  wrapper?.classList.add('is-pointed')
  imageTerms = []
  emit('image-hover', wrapper ? Number(wrapper.dataset.n) : null)
})
const tip = ref<{ x: number, y: number, left: boolean, up: boolean } | null>(null)
const tipSize = computed(() => props.imageSize(hovered.value ? Number(hovered.value.n) - 1 : 0))

// Degrees a second round the vertical axis (upright: no tilt, so a keyword
// keeps to its row).
const SPIN = 3
// The lines fading in and out with the hover (a second's share per frame).
const LINES_FADE = 5
// A hovered keyword's lines: to its nearest few it shares an article with.
const LINKS = 2
// How far round the front a chip has to be to come in, and to go.
const SHOW_Z = 0.2
const HIDE_Z = 0.06

let width = 0
let height = 0
let ratio = 1
let cx = 0
let cy = 0
let radius = 0
let yaw = 0
const pitch = 0
// The lines' presence (0-1), and the keyword they're drawn for while fading out.
let lines = 0
let linesFor: Tag | null = null
let speed = SPIN
let raf = 0
let last = 0
const states = new Map<string, ChipState>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const stops = new Map<string, () => void>()
let boxes: { tag: Tag, left: number, top: number, right: number, bottom: number }[] = []
let pointer: { x: number, y: number } | null = null
// What lies over the sphere (the headline's lines, the subtitle, the button,
// the tab): no chip comes in under them, one turning under them goes.
const AVOID = '.sentence-text, .splash-subtitle-box, .splash-cta, .splash-tab'
let avoid: { left: number, top: number, right: number, bottom: number }[] = []
let avoidAt = 0
function measureAvoid() {
  const origin = canvas.value?.getBoundingClientRect()
  const splash = canvas.value?.closest('.splash')
  if (!origin || !splash) return
  // spread: the zone round the headline and its subtitle.
  if (props.spread && props.grid) {
    const rects = [...splash.querySelectorAll<HTMLElement>('.sentence-text, .splash-subtitle-box')].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0)
    if (rects.length) {
      const dx = (props.grid.right - props.grid.left) * SPREAD_HUG.x
      const dy = props.grid.cellH * SPREAD_HUG.rows
      hug = {
        left: Math.min(...rects.map((r) => r.left)) - origin.left - dx,
        top: Math.min(...rects.map((r) => r.top)) - origin.top - dy,
        right: Math.max(...rects.map((r) => r.right)) - origin.left + dx,
        bottom: Math.max(...rects.map((r) => r.bottom)) - origin.top + dy,
      }
    }
  }
  avoid = [...splash.querySelectorAll<HTMLElement>(props.avoidBand ? `${AVOID}, .splash-images` : AVOID)].map((el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left - origin.left - 8, top: r.top - origin.top - 6, right: r.right - origin.left + 8, bottom: r.bottom - origin.top + 6 }
  }).filter((r) => r.right > r.left && r.bottom > r.top)
}
// stand: the band's images, each its own outline (their heights differ), in
// the canvas's terms, measured every frame (the band drifts). A keyword may
// come close and straddle an image's edge a little (STAND_STRADDLE), never sit
// on it.
let imageRects: { left: number, top: number, right: number, bottom: number }[] = []
const STAND_STRADDLE = { x: 24, y: 6 } // px into an image a keyword may reach
// stand: every line runs from a corner of the keyword (startOf: the nearest) to
// the same point on its image (anchorOf): its number's bottom left corner, or
// (anchorImage) the image's own top left one, both to the pixel, off the
// elements themselves. The canvas lies under the band (is-layered); where a
// line crosses the number's black box on its way to that corner, the overlay
// draws it in white over the box (intoNumber), so the lines are seen to meet.
function startOf(tag: Tag, origin: DOMRect, toward: [number, number]): [number, number] {
  const r = chipEls.get(tag.id)!.getBoundingClientRect()
  // Always one of its corners: the one nearest where the line goes.
  const corners: [number, number][] = [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]].map(([x, y]) => [x! - origin.left, y! - origin.top])
  return corners.sort((a, b) => Math.hypot(a[0] - toward[0], a[1] - toward[1]) - Math.hypot(b[0] - toward[0], b[1] - toward[1]))[0]!
}
function anchorOf(wrapper: HTMLElement, origin: DOMRect): [number, number] {
  const number = !props.anchorImage && wrapper.querySelector('.splash-image-number')
  if (number) {
    const r = number.getBoundingClientRect()
    return [r.left - origin.left, r.bottom - origin.top]
  }
  const r = wrapper.querySelector('img')!.getBoundingClientRect()
  return [r.left - origin.left, r.top - origin.top]
}
function intoNumber(wrapper: HTMLElement, origin: DOMRect, x0: number, y0: number, x1: number, y1: number) {
  const top = overlay.value?.getContext('2d')
  const number = !props.anchorImage && wrapper.querySelector('.splash-image-number')
  if (!top || !number) return
  const r = number.getBoundingClientRect()
  top.save()
  top.beginPath()
  top.rect(r.left - origin.left, r.top - origin.top, r.width, r.height)
  top.clip()
  top.beginPath()
  top.moveTo(x0, y0)
  top.lineTo(x1, y1)
  top.strokeStyle = '#fff'
  top.lineWidth = 1
  top.stroke()
  top.restore()
}
function measureImages() {
  const origin = canvas.value?.getBoundingClientRect()
  const wrappers = canvas.value?.closest('.splash')?.querySelectorAll<HTMLElement>('.splash-images .splash-image-wrapper img') ?? []
  if (!origin) return
  imageRects = [...wrappers].map((img) => {
    const r = img.getBoundingClientRect()
    return { left: r.left - origin.left + STAND_STRADDLE.x, top: r.top - origin.top + STAND_STRADDLE.y, right: r.right - origin.left - STAND_STRADDLE.x, bottom: r.bottom - origin.top - STAND_STRADDLE.y }
  }).filter((r) => r.right > r.left && r.bottom > r.top)
}
// A press on the sphere, for its click.
let pressed = false
const reducedMotion = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function build() {
  const list = (categories.value[language.value] ?? []).filter((category) => category.slug !== 'question')
  const all = list.flatMap((category, index) => category.tags.map((tag) => ({
    id: tag.id,
    title: tag.title,
    category: category.title,
    color: BADGE_COLORS[index % BADGE_COLORS.length]!,
    image: tag.image?.[0]?.thumb ?? null,
  }))).map((item, i) => ({ ...item, n: String(i + 1).padStart(2, '0') }))
  // Shuffled (seeded) so a category doesn't sit in one band (place: on the
  // grid's rows).
  let seed = 7
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!]
  }
  const list2: Tag[] = all.map((item) => ({ ...item, v: [0, 0, 1], links: [] }))
  place(list2)
  const byId = new Map(list2.map((tag) => [tag.id, tag]))
  const shared = new Map(list2.map((tag) => [tag, new Set<Tag>()]))
  for (const article of articles.value ?? []) {
    const inIt = [...(article.concepts ?? []), ...(article.themes ?? []), ...(article.platforms ?? [])].map((ref) => byId.get(ref.id)).filter((tag): tag is Tag => !!tag)
    for (const a of inIt) for (const b of inIt) if (a !== b) shared.get(a)!.add(b)
  }
  const near = (a: Tag, b: Tag) => a.v[0] * b.v[0] + a.v[1] * b.v[1] + a.v[2] * b.v[2]
  for (const tag of list2) tag.links = [...shared.get(tag)!].sort((a, b) => near(tag, b) - near(tag, a)).slice(0, LINKS)
  for (const id of timers.keys()) clearTimeout(timers.get(id))
  for (const stop of stops.values()) stop()
  timers.clear()
  stops.clear()
  states.clear()
  hovered.value = null
  tags.value = list2
}

// Turned (yaw round the vertical, then tilted by pitch), to screen.
function project(v: [number, number, number]): Projected {
  const [x0, y0, z0] = v
  const x1 = x0 * Math.cos(yaw) + z0 * Math.sin(yaw)
  const z1 = -x0 * Math.sin(yaw) + z0 * Math.cos(yaw)
  const y2 = y0 * Math.cos(pitch) - z1 * Math.sin(pitch)
  const z2 = y0 * Math.sin(pitch) + z1 * Math.cos(pitch)
  return { x: cx + x1 * radius, y: cy - y2 * radius, z: z2 }
}
// Points along the great circle from a to b, on the surface.
function arc(a: Tag, b: Tag, steps = 32): Projected[] {
  const [ax, ay, az] = a.v
  const [bx, by, bz] = b.v
  const omega = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz)))
  const s = Math.sin(omega) || 1
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const k1 = Math.sin((1 - t) * omega) / s
    const k2 = Math.sin(t * omega) / s
    return project([k1 * ax + k2 * bx, k1 * ay + k2 * by, k1 * az + k2 * bz])
  })
}

// The row's label animation (Splash.vue's revealLabel): the letters come in
// along a steady front, the chip building behind them, framed once through.
function chipIn(tag: Tag) {
  const el = chipEls.get(tag.id)
  if (!el) return
  states.set(tag.id, 'in')
  stops.get(tag.id)?.()
  clearTimeout(timers.get(tag.id))
  el.classList.remove('is-building', 'is-framed', 'is-out')
  el.classList.add('is-on')
  timers.set(tag.id, setTimeout(() => {
    if (states.get(tag.id) !== 'in') return
    const { duration, perLetter, letters, stop } = boxReveal(el, { mode: 'in', lettersPerSecond: 24, steady: true, stepMs: 16 })
    stops.set(tag.id, stop)
    el.style.setProperty('--build-ms', `${Math.round((letters + 1) * perLetter)}ms`)
    requestAnimationFrame(() => el.classList.add('is-building'))
    timers.set(tag.id, setTimeout(() => {
      el.classList.add('is-framed')
      states.set(tag.id, 'on')
    }, duration))
  }, 0))
}
// Going round the back: the same way out, the chip shutting after its letters.
function chipOut(tag: Tag) {
  const el = chipEls.get(tag.id)
  if (!el) return
  states.set(tag.id, 'out')
  stops.get(tag.id)?.()
  clearTimeout(timers.get(tag.id))
  const { duration, stop } = boxReveal(el, { mode: 'out' })
  stops.set(tag.id, stop)
  el.style.setProperty('--build-ms', `${Math.round(duration)}ms`)
  el.classList.add('is-out')
  timers.set(tag.id, setTimeout(() => {
    el.classList.remove('is-on', 'is-building', 'is-framed', 'is-out')
    unwrapBoxReveal(el)
    states.set(tag.id, 'away')
  }, duration))
}

// On the grid: the sphere upright, a keyword only ever moves across, so each
// is given a row of the grid (in the middle of its cells), as many to every
// row, spaced evenly round it, each row turned a little from the one above
// (the golden angle), so they spread over the whole grid, not in clumps.
// Without the grid yet: spread evenly over the sphere (a Fibonacci lattice).
function place(list: Tag[]) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const g = props.grid
  const rows: number[] = []
  if (g && radius) {
    for (let y = g.top + g.cellH / 2; y < g.bottom; y += g.cellH) {
      const y0 = (cy - y) / radius
      if (Math.abs(y0) < 0.92) rows.push(y0)
    }
  }
  if (!rows.length) {
    list.forEach((tag, i) => {
      const y = (1 - ((i + 0.5) / list.length) * 2) * 0.8
      const r = Math.sqrt(1 - y * y)
      tag.v = [r * Math.cos(i * golden), y, r * Math.sin(i * golden)]
    })
    return
  }
  const count = rows.map((_, r) => Math.floor(list.length / rows.length) + (r < list.length % rows.length ? 1 : 0))
  list.forEach((tag, i) => {
    const r = i % rows.length
    const j = Math.floor(i / rows.length)
    const y0 = rows[r]!
    const around = Math.sqrt(1 - y0 * y0)
    const theta = (j / count[r]!) * Math.PI * 2 + r * golden
    tag.v = [around * Math.cos(theta), y0, around * Math.sin(theta)]
  })
}

function resize() {
  const el = canvas.value
  if (!el) return
  ratio = Math.min(2, window.devicePixelRatio || 1)
  width = el.clientWidth
  height = el.clientHeight
  el.width = Math.round(width * ratio)
  el.height = Math.round(height * ratio)
  if (overlay.value) {
    overlay.value.width = el.width
    overlay.value.height = el.height
  }
  // The grid's: on its middle, a whole number of its rows in radius, wide
  // enough to bring the keywords out past the headline (running off the
  // grid's top and bottom, as RUNOUT's off the screen).
  const g = props.grid
  cx = g ? (g.left + g.right) / 2 : width / 2
  cy = g ? (g.top + g.bottom) / 2 : height / 2
  radius = g ? Math.max(1, Math.round(((g.right - g.left) * (props.radiusShare ?? (props.spread ? SPREAD_RADIUS : 0.36))) / g.cellH)) * g.cellH : Math.min(width, height) * 0.45
  if (tags.value.length) place(tags.value)
}
watch(() => props.grid, resize)

function draw(now: number) {
  raf = requestAnimationFrame(draw)
  // Held still, unseen, until the logo has gone.
  if (intro.value === 'logo') return
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
  last = now
  const focus = hovered.value
  const image = hoveredImage.value
  // The drift, easing to the hover's stop and back.
  const target = focus || image || reducedMotion ? 0 : SPIN
  speed += (target - speed) * Math.min(1, dt * (target ? 0.8 : 5))
  yaw += speed * dt * (Math.PI / 180)
  const ctx = canvas.value?.getContext('2d')
  const list = tags.value
  if (!ctx || !list.length) return
  const dark = document.documentElement.dataset.theme === 'dark'
  const ink = (alpha: number) => (dark ? `rgba(232, 232, 234, ${alpha})` : `rgba(26, 26, 26, ${alpha})`)
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const top = overlay.value?.getContext('2d')
  top?.setTransform(ratio, 0, 0, ratio, 0, 0)
  top?.clearRect(0, 0, width, height)
  // The headline moves (its letters scramble, its boxes resize): measured again now and then.
  if (now - avoidAt > 400) {
    avoidAt = now
    measureAvoid()
  }
  if (props.stand) measureImages()
  // In front: up to full; the far side: faint.
  const depthAlpha = (z: number) => (z >= 0 ? 0.4 + 0.6 * Math.min(1, z / 0.4) : Math.max(0.05, 0.16 + z * 0.12))
  const lit = (tag: Tag) => props.stand
    ? (image ? imageTerms.includes(tag) : !focus || tag === focus)
    : !focus || tag === focus || focus.links.includes(tag)

  // The lines, only with a hover: fading in, and out after it (stand: none
  // between keywords, only to the images).
  if (focus && !props.stand) linesFor = focus
  lines += ((focus ? 1 : 0) - lines) * Math.min(1, dt * LINES_FADE)
  if (lines < 0.01) linesFor = null
  if (linesFor) {
    // Its links, in ink, over the surface (fading round the back).
    for (const b of linesFor.links) {
      const points = arc(linesFor, b)
      ctx.lineWidth = 1
      for (let i = 1; i < points.length; i++) {
        const p = points[i - 1]!
        const q2 = points[i]!
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q2.x, q2.y)
        ctx.strokeStyle = ink(0.85 * lines * depthAlpha((p.z + q2.z) / 2))
        ctx.stroke()
      }
    }
  }

  // The chips: placed on their point (the lines meet at their left edge), the
  // nearest first; one comes in only where it has room and is well round.
  const placed = list.map((tag) => ({ tag, p: project(tag.v) })).sort((a, b) => b.p.z - a.p.z)
  // spread: how many are in sight on each side of the sphere's middle.
  const sides = { left: 0, right: 0 }
  const cap = props.maxShown ?? (props.spread ? SPREAD_MAX : Infinity)
  if (cap < Infinity) {
    for (const { tag, p } of placed) {
      const state = states.get(tag.id)
      if (state === 'in' || state === 'on') sides[p.x < cx ? 'left' : 'right']++
    }
  }
  const roomFor = (x: number) => {
    if (cap === Infinity) return true
    const side = x < cx ? 'left' : 'right'
    const other = side === 'left' ? 'right' : 'left'
    // Balanced from the third on (the first two come in as they turn up,
    // so the sphere is never left bare waiting for the other side).
    const total = sides.left + sides.right
    return total < cap && (total < 2 || sides[side] <= sides[other])
  }
  const kept: typeof boxes = []
  for (const { tag, p } of placed) {
    const el = chipEls.get(tag.id)
    if (!el) continue
    const state = states.get(tag.id) ?? 'away'
    const w = el.offsetWidth
    const h = el.offsetHeight
    const box = { tag, left: p.x, top: p.y - h / 2, right: p.x + w, bottom: p.y + h / 2 }
    const clash = kept.some((o) => box.left < o.right + 6 && box.right > o.left - 6 && box.top < o.bottom + 4 && box.bottom > o.top - 4)
    const inside = box.left > 8 && box.right < width - 8 && box.top > 8 && box.bottom < height - 8
      && avoid.every((o) => box.right < o.left || box.left > o.right || box.bottom < o.top || box.top > o.bottom)
      && (!props.stand || imageRects.every((o) => box.right <= o.left || box.left >= o.right || box.bottom <= o.top || box.top >= o.bottom))
      && (!props.spread || !hug || (box.left >= hug.left && box.right <= hug.right && box.top >= hug.top && box.bottom <= hug.bottom))
    const showing = state === 'in' || state === 'on'
    const gone = p.z < HIDE_Z || !inside
    if (showing && gone && tag !== focus) chipOut(tag)
    else if (state === 'away' && p.z > SHOW_Z && inside && !clash && roomFor(p.x)) {
      chipIn(tag)
      if (cap < Infinity) sides[p.x < cx ? 'left' : 'right']++
    }
    const now2 = states.get(tag.id)
    if (now2 === 'in' || now2 === 'on' || now2 === 'out') {
      kept.push(box)
      el.style.transform = `translate(${Math.round(box.left)}px, ${Math.round(box.top)}px)`
      el.style.zIndex = String(Math.round(100 + p.z * 100))
      el.style.opacity = String(lit(tag) ? 1 : 0.3)
      el.classList.toggle('is-current', tag === focus || (!!image && imageTerms.includes(tag)))
    }
  }
  boxes = kept.filter((box) => states.get(box.tag.id) !== 'out')

  // Under a still pointer, a chip turning in catches it.
  if (pointer && !focus) {
    const under = hitTest(pointer.x, pointer.y)
    if (under) hovered.value = under
  }
  // keywords,images: a line to an image of the band, the one under its name
  // if there's one in sight, else the nearest.
  linkToStrip(ctx, focus, ink)
  linkFromImage(ctx, image, ink)
  if (focus && !props.linkStrip) {
    const box = boxes.find((b) => b.tag === focus)
    const size = props.imageSize(Number(focus.n) - 1)
    const leftSide = box ? box.right + 8 + size.width > width : false
    // Near the bottom, it hangs above the chip's line instead.
    const up = box ? box.top + size.height + 40 > height : false
    // In the window's terms: the card is over everything (the headline included).
    const origin = canvas.value!.getBoundingClientRect()
    tip.value = box ? { x: origin.left + (leftSide ? box.left - 8 : box.right + 8), y: origin.top + (up ? box.bottom : box.top), left: leftSide, up } : null
  }
  else tip.value = null
}

let linked: HTMLElement | null = null
let linkedFor: Tag | null = null
function linkToStrip(ctx: CanvasRenderingContext2D, focus: Tag | null, ink: (alpha: number) => string) {
  if (!props.linkStrip) return
  const box = focus && boxes.find((b) => b.tag === focus)
  if (!focus || !box) {
    linked?.classList.remove('is-linked')
    linked = null
    linkedFor = null
    return
  }
  const origin = canvas.value!.getBoundingClientRect()
  // In sight, and grown to its full size.
  const shown = (wrapper: HTMLElement) => {
    const img = wrapper.querySelector('img')?.getBoundingClientRect()
    return !!img && img.width > 0.95 * wrapper.offsetWidth && img.left > 0 && img.right < window.innerWidth
  }
  if (linkedFor !== focus || !linked || !linked.isConnected || !shown(linked)) {
    const all = [...(canvas.value!.closest('.splash')?.querySelectorAll<HTMLElement>('.splash-images .splash-image-wrapper') ?? [])].filter(shown)
    const named = all.filter((wrapper) => wrapper.dataset.label?.toLowerCase() === focus.title.toLowerCase())
    const from = { x: origin.left + box.left, y: origin.top + (box.top + box.bottom) / 2 }
    const distance = (wrapper: HTMLElement) => {
      const r = wrapper.querySelector('img')!.getBoundingClientRect()
      return Math.hypot(r.left + r.width / 2 - from.x, r.top + r.height / 2 - from.y)
    }
    const pick = (named.length ? named : all).sort((a, b) => distance(a) - distance(b))[0] ?? null
    linked?.classList.remove('is-linked')
    linked = pick
    linked?.classList.add('is-linked')
    linkedFor = focus
  }
  if (!linked) return
  // From the keyword's point to the image's nearest corner (stand: from the
  // keyword's bottom corner facing it to anchorOf, always the same point).
  const r = linked.querySelector('img')!.getBoundingClientRect()
  let x0 = box.left
  let y0 = (box.top + box.bottom) / 2
  const corners = [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]].map(([x, y]) => [x! - origin.left, y! - origin.top] as const)
  const [x1, y1] = props.stand ? anchorOf(linked, origin) : corners.sort((a, b) => Math.hypot(a[0] - x0, a[1] - y0) - Math.hypot(b[0] - x0, b[1] - y0))[0]!
  if (props.stand) [x0, y0] = startOf(box.tag, origin, [x1, y1])
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.strokeStyle = ink(0.9)
  ctx.lineWidth = 1
  ctx.stroke()
  if (props.stand) intoNumber(linked, origin, x0, y0, x1, y1)
  // stand: the line runs into the inked number, no mark at its end.
  if (props.stand) return
  ctx.fillStyle = ink(0.9)
  ctx.fillRect(x1 - 2, y1 - 2, 4, 4)
}

// stand: from the hovered image (anchorOf) to each of its keywords (startOf). Its keywords are chosen once, as the pointer comes on it (the
// sphere stops meanwhile); one turning away is let go.
function linkFromImage(ctx: CanvasRenderingContext2D, wrapper: HTMLElement | null, ink: (alpha: number) => string) {
  if (!props.stand || !wrapper) return
  const origin = canvas.value!.getBoundingClientRect()
  // Its keywords the nearest to the image.
  const image = wrapper.querySelector('img')!.getBoundingClientRect()
  const centre = { x: image.left + image.width / 2 - origin.left, y: image.top + image.height / 2 - origin.top }
  if (!imageTerms.length) {
    const label = wrapper.dataset.label?.toLowerCase()
    const distance = (box: typeof boxes[number]) => Math.hypot(box.left - centre.x, (box.top + box.bottom) / 2 - centre.y)
    const near = [...boxes].sort((a, b) => distance(a) - distance(b)).map((box) => box.tag)
    const own = near.filter((tag) => tag.title.toLowerCase() === label)
    imageTerms = [...new Set([...own, ...near])].slice(0, STAND_TERMS)
  }
  // Every line to the same point (anchorOf).
  const [x1, y1] = anchorOf(wrapper, origin)
  ctx.strokeStyle = ink(0.9)
  ctx.lineWidth = 1
  for (const tag of imageTerms) {
    const box = boxes.find((b) => b.tag === tag)
    if (!box) continue
    const [x0, y0] = startOf(tag, origin, [x1, y1])
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    intoNumber(wrapper, origin, x0, y0, x1, y1)
  }
}
// stand: the band image under a point in the window (a keyword over it wins).
function imageAt(x: number, y: number) {
  const wrappers = canvas.value?.closest('.splash')?.querySelectorAll<HTMLElement>('.splash-images .splash-image-wrapper') ?? []
  for (const wrapper of wrappers) {
    const r = wrapper.querySelector('img')?.getBoundingClientRect()
    if (r && r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return wrapper
  }
  return null
}

function hitTest(x: number, y: number) {
  for (const box of boxes) if (x >= box.left - 2 && x <= box.right + 2 && y >= box.top - 2 && y <= box.bottom + 2) return box.tag
  return null
}
function localPoint(event: PointerEvent) {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) return null
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  return x < 0 || y < 0 || x > rect.width || y > rect.height ? null : { x, y }
}
// The headline and the button lie over the sphere: hover is followed on the
// window, so a chip shows through them; a button or a link keeps its pointer.
const overControl = (event: Event) => !!(event.target as Element | null)?.closest?.('a, button, [role="button"]')
function onMove(event: PointerEvent) {
  pointer = event.pointerType === 'mouse' && !overControl(event) ? localPoint(event) : null
  if (event.pointerType !== 'mouse') return
  hovered.value = pointer ? hitTest(pointer.x, pointer.y) : null
  if (props.stand) hoveredImage.value = pointer && !hovered.value ? imageAt(event.clientX, event.clientY) : null
}
function onDown(event: PointerEvent) {
  pressed = !overControl(event) && !!localPoint(event)
}
function onUp(event: PointerEvent) {
  const wasDown = pressed
  pressed = false
  if (!wasDown) return
  const at = localPoint(event)
  const tag = at && hitTest(at.x, at.y)
  if (props.stand) {
    if (tag || (at && imageAt(event.clientX, event.clientY))) emit('pick', { x: event.clientX, y: event.clientY })
    return
  }
  if (!tag) return
  // A tap on a phone shows it first; a second tap (or a click) opens it.
  if (event.pointerType !== 'mouse' && hovered.value !== tag) {
    hovered.value = tag
    return
  }
  navigateTo(pathInLanguage(`/keywords/${tag.id}`, language.value))
}

function setChip(id: string, el: unknown) {
  if (el instanceof HTMLElement) chipEls.set(id, el)
  else chipEls.delete(id)
}

let observer: ResizeObserver | undefined
onMounted(() => {
  resize()
  build()
  observer = new ResizeObserver(resize)
  observer.observe(canvas.value!)
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  raf = requestAnimationFrame(draw)
})
// The CMS data may land after the sphere, or change with the language.
watch(() => [categories.value[language.value], articles.value], () => {
  if (canvas.value) build()
})
onBeforeUnmount(() => {
  linked?.classList.remove('is-linked')
  hoveredImage.value?.classList.remove('is-pointed')
  cancelAnimationFrame(raf)
  observer?.disconnect()
  for (const timer of timers.values()) clearTimeout(timer)
  for (const stop of stops.values()) stop()
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerdown', onDown)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
})
</script>

<template>
  <div class="keyword-sphere" :class="{ 'is-pointing': hovered || hoveredImage, 'is-layered': stand }">
    <canvas ref="canvas" class="keyword-sphere-canvas" aria-hidden="true" />
    <canvas v-if="stand" ref="overlay" class="keyword-sphere-overlay" aria-hidden="true" />
    <span
      v-for="tag in tags"
      :key="tag.id"
      :ref="(el) => setChip(tag.id, el)"
      class="splash-image-name keyword-sphere-chip text-small"
      :style="{ '--box-color': tag.color }"
    >{{ tag.title }}</span>
    <!-- Over the headline's boxes, which lie over the keywords: on the page's top. -->
    <Teleport to="body">
      <div
        v-if="hovered && tip"
        class="keyword-sphere-tip"
        :class="{ 'is-left': tip.left, 'is-up': tip.up }"
        :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
      >
        <img v-if="hovered.image" :key="hovered.id" :src="hovered.image" alt="" :style="{ width: `${tipSize.width}px`, height: `${tipSize.height}px` }">
        <!-- Captioned as the row's images: its number. -->
        <div class="keyword-sphere-tip-caption text-small">
          <span class="keyword-sphere-tip-number">[{{ hovered.n }}]</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.keyword-sphere {
  position: absolute;
  overflow: hidden;
}

/* stand: no layer of its own, so its lines (the canvas) go under the band of
   images and its keywords (z-index inline) over it. */
.keyword-sphere.is-layered {
  z-index: auto !important;
}

.keyword-sphere.is-layered .keyword-sphere-canvas {
  position: relative;
  z-index: 0;
}

.keyword-sphere-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.keyword-sphere.is-pointing {
  cursor: pointer;
}

.keyword-sphere-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* A row label's chip (Splash.vue's .splash-image-name, its letters' states
   global there), placed by script; hidden until it comes in. */
.keyword-sphere-chip {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  padding: 2px 6px;
  color: #1a1a1a;
  white-space: nowrap;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.keyword-sphere-chip.is-on {
  visibility: visible;
}

/* Its letters hidden until boxReveal has wrapped them. */
.keyword-sphere-chip.is-on:not(:has(.box-char)):not(.is-framed) {
  visibility: hidden;
}

/* The chip: shut to its left edge until it builds (is-building, over
   --build-ms), whole once framed; going, it shuts again from the right. */
.keyword-sphere-chip::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--box-color);
  clip-path: inset(0 100% 0 0);
}

.keyword-sphere-chip.is-building::before {
  clip-path: inset(0 0 0 0);
  transition: clip-path var(--build-ms, 500ms) linear;
}

.keyword-sphere-chip.is-framed::before {
  clip-path: inset(0 0 0 0);
}

.keyword-sphere-chip.is-out::before {
  clip-path: inset(0 0 0 100%);
  transition: clip-path var(--build-ms, 500ms) linear;
}

/* Hovered: ink, its letters in the page's colour. */
.keyword-sphere-chip.is-current {
  color: var(--color-surface);
}

.keyword-sphere-chip.is-current::before {
  background: var(--color-ink);
}

.keyword-sphere-tip {
  position: fixed;
  z-index: 1000;
  display: grid;
  gap: 1px;
  pointer-events: none;
  animation: keyword-sphere-tip-in 0.2s ease both;
}

/* The global img filter gives it the site's silver (#duotone-silver). */
.keyword-sphere-tip img {
  display: block;
  object-fit: cover;
}

.keyword-sphere-tip-caption {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-top: 9px;
  color: var(--color-ink);
}

/* Areal (not its mono), with its other zero, as the row's numbers. */
.keyword-sphere-tip-number {
  font-family: var(--font-text);
  font-feature-settings: 'zero', 'ss11', 'ss05', 'ss06';
}

@keyframes keyword-sphere-tip-in {
  from { opacity: 0; transform: translateY(4px); }
}

.keyword-sphere-tip.is-left {
  transform: translateX(-100%);
  animation-name: keyword-sphere-tip-in-left;
}

@keyframes keyword-sphere-tip-in-left {
  from { opacity: 0; transform: translate(-100%, 4px); }
  to { transform: translateX(-100%); }
}

.keyword-sphere-tip.is-up {
  transform: translateY(-100%);
  animation-name: keyword-sphere-tip-in-up;
}

.keyword-sphere-tip.is-left.is-up {
  transform: translate(-100%, -100%);
  animation-name: keyword-sphere-tip-in-left-up;
}

@keyframes keyword-sphere-tip-in-up {
  from { opacity: 0; transform: translateY(calc(-100% + 4px)); }
  to { transform: translateY(-100%); }
}

@keyframes keyword-sphere-tip-in-left-up {
  from { opacity: 0; transform: translate(-100%, calc(-100% + 4px)); }
  to { transform: translate(-100%, -100%); }
}

@media (prefers-reduced-motion: reduce) {
  .keyword-sphere-tip { animation: none; }
}
</style>
