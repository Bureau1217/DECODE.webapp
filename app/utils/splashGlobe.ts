// /?splash=globe: a globe turning slowly behind the white splash, as graphic
// composition (after the "Open Structures" poster): its graticule in grey
// dotted lines, every coast in fainter dots, and a few countries here and
// there in light silver. Orthographic, drawn on a canvas, by hand (no
// geo library): the far side is left out, a line breaking where it goes over
// the edge.

type Ring = [number, number][]
type Country = { name: string, rings: Ring[], centre: [number, number] }

export type GlobeOptions = {
  // Of the canvas's half diagonal: 1, the globe covers the whole canvas.
  radius?: number
  // The lines on a canvas of their own (over the images, in difference): drawn
  // in the complement of their grey, so they read the same over white.
  lines?: HTMLCanvasElement
  // Dark mode: light lines over the dark map.
  dark?: boolean
  // Where the globe's centre sits, as shares of the canvas.
  centreX?: number
  centreY?: number
  // Degrees a second, round the poles.
  spin?: number
  // How far the north pole leans towards the viewer (degrees).
  tilt?: number
  countries?: number
  // Areas to keep the countries out of (what lies over the globe: the headline,
  // its subtitle), in px from the canvas's corner.
  avoid?: () => { left: number, top: number, right: number, bottom: number }[]
}

const RAD = Math.PI / 180

export async function startGlobe(canvas: HTMLCanvasElement, options: GlobeOptions = {}) {
  const { radius = 1, centreX = 0.5, centreY = 0.5, spin = 2.4, tilt = 24, countries: count = 6, avoid = () => [], lines, dark = false } = options
  const data = (await import('~/data/world-countries.json')).default as { features: { properties: { name: string }, geometry: { type: string, coordinates: unknown } }[] }
  const world: Country[] = data.features.map((feature) => {
    const polygons = (feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates) as Ring[][]
    const rings = polygons.flatMap((polygon) => polygon.slice(0, 1))
    // Its centre, by its biggest ring's points (enough to tell its side).
    const main = rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0]!)
    const lon = main.reduce((sum, p) => sum + p[0], 0) / main.length
    const lat = main.reduce((sum, p) => sum + p[1], 0) / main.length
    return { name: feature.properties.name, rings, centre: [lon, lat] as [number, number] }
  })
  // Big enough to read as a shape: more points in its outline.
  const sizeable = world.filter((country) => country.rings.reduce((n, ring) => n + ring.length, 0) > 50)

  const ctx = canvas.getContext('2d')!
  const lineCtx = lines?.getContext('2d') ?? ctx
  // A grey as drawn: over white in difference, its complement shows it.
  const grey = (hex: string) => (lines && !dark ? `#${(0xFFFFFF - Number.parseInt(hex.slice(1), 16)).toString(16).padStart(6, '0')}` : hex)
  let width = 0
  let height = 0
  let ratio = 1
  const resize = () => {
    ratio = Math.min(2, window.devicePixelRatio || 1)
    width = canvas.clientWidth
    height = canvas.clientHeight
    for (const c of lines ? [canvas, lines] : [canvas]) {
      c.width = Math.round(width * ratio)
      c.height = Math.round(height * ratio)
    }
  }
  const globeRadius = () => (Math.hypot(width, height) / 2) * radius
  // The countries in one flat light silver, see-through (SILVER_ALPHA): the
  // site's silver duotone near its lightest; over dark mode's map, lighter.
  const SILVER = dark ? '#d8dadc' : '#dedfe0'
  const SILVER_ALPHA = dark ? 0.32 : 0.55
  // The lines' greys, by mode.
  const tone = (light: string, onDark: string) => grey(dark ? onDark : light)
  const resizeAll = resize
  resizeAll()

  // Starting over Europe, Africa or Asia (most land), turning from there.
  let lon0 = -(Math.random() * 90 - 10)
  let picked: Country[] = []
  // Where a country's centre lands now (px), and whether it's in sight: on
  // our side, inside the canvas, clear of what lies over it.
  const inSight = (country: Country, margin = 40, clear = true) => {
    const r = globeRadius()
    const [x, y, front] = project(country.centre[0], country.centre[1], width * centreX, height * centreY, r)
    if (!front || x < 0 || y < 0 || x > width || y > height) return false
    if (!clear) return true
    return avoid().every((box) => x < box.left - margin || x > box.right + margin || y < box.top - margin || y > box.bottom + margin)
  }
  // A few, far apart (APART degrees at least), one coming in at a time, at
  // least APPEAR_GAP_MS after the one before, fading in and out over FADE_MS.
  const APART = 22
  const APPEAR_GAP_MS = 1700
  const FADE_MS = 900
  const life = new Map<Country, { born: number, dying?: number }>()
  let lastAdded = -Infinity
  // Routes: a dotted great-circle arc drawing itself (over ROUTE_MS) from
  // each new country to the one that came before it, as the campaign map's.
  const ROUTE_MS = 1600
  let routes: { from: Country, to: Country, born: number }[] = []
  let previous: Country | null = null
  // The last few gone, not back straight away.
  let recent: Country[] = []
  const live = () => picked.filter((country) => !life.get(country)?.dying)
  const apart = (country: Country) => live().every((other) => Math.hypot(other.centre[0] - country.centre[0], other.centre[1] - country.centre[1]) > APART)
  const going = (country: Country, now: number) => {
    const state = life.get(country)
    if (state && !state.dying) state.dying = now
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Still (reduced motion): all at once, there to stay.
  const pick = () => {
    for (const country of sizeable.filter((c) => inSight(c)).sort(() => Math.random() - 0.5)) {
      if (picked.length >= count) break
      if (apart(country)) {
        picked.push(country)
        life.set(country, { born: -Infinity })
      }
    }
  }
  const fadeOf = (country: Country, now: number) => {
    const state = life.get(country)
    if (!state) return 0
    const into = Math.min(1, (now - state.born) / FADE_MS)
    return state.dying === undefined ? into : into * Math.max(0, 1 - (now - state.dying) / FADE_MS)
  }

  // [x, y, facing us] for a point.
  const project = (lon: number, lat: number, cx: number, cy: number, r: number): [number, number, boolean] => {
    const l = (lon + lon0) * RAD
    const p = lat * RAD
    const x = Math.cos(p) * Math.sin(l)
    const y = Math.sin(p)
    const z = Math.cos(p) * Math.cos(l)
    // Tilted round the horizontal axis.
    const a = tilt * RAD
    const y2 = y * Math.cos(a) - z * Math.sin(a)
    const z2 = y * Math.sin(a) + z * Math.cos(a)
    return [cx + x * r, cy - y2 * r, z2 > 0]
  }
  // A line as dots along it, every `gap` px, only on our side.
  const dotLine = (points: [number, number][], cx: number, cy: number, r: number, gap: number, size: number) => {
    let carry = 0
    let prev: [number, number, boolean] | null = null
    for (const [lon, lat] of points) {
      const at = project(lon, lat, cx, cy, r)
      if (prev && prev[2] && at[2]) {
        const dx = at[0] - prev[0]
        const dy = at[1] - prev[1]
        const length = Math.hypot(dx, dy)
        let d = carry
        while (d < length) {
          lineCtx.fillRect(prev[0] + (dx * d) / length - size / 2, prev[1] + (dy * d) / length - size / 2, size, size)
          d += gap
        }
        carry = d - length
      }
      prev = at
    }
  }
  const fillShape = (rings: Ring[], cx: number, cy: number, r: number, alpha: number) => {
    ctx.beginPath()
    for (const ring of rings) {
      let started = false
      for (const [lon, lat] of ring) {
        const [x, y, front] = project(lon, lat, cx, cy, r)
        if (!front) { started = false; continue }
        if (started) ctx.lineTo(x, y)
        else { ctx.moveTo(x, y); started = true }
      }
      ctx.closePath()
    }
    ctx.fillStyle = SILVER
    ctx.globalAlpha = SILVER_ALPHA * alpha
    ctx.fill('evenodd')
    ctx.globalAlpha = 1
  }

  if (reducedMotion) pick()

  // Every GRATICULE degrees.
  const GRATICULE = 20
  const meridians = Array.from({ length: 360 / GRATICULE }, (_, k) => Array.from({ length: 73 }, (_, i) => [k * GRATICULE, -90 + i * 2.5] as [number, number]))
  const parallels = Array.from({ length: 180 / GRATICULE - 1 }, (_, k) => Array.from({ length: 145 }, (_, i) => [-180 + i * 2.5, -90 + (k + 1) * GRATICULE] as [number, number]))

  // As they turn out of sight, one at a time gives way to another coming in.
  const facingShare = (country: Country) => Math.cos(country.centre[1] * RAD) * Math.cos((country.centre[0] + lon0) * RAD)
  const keepFacing = (now: number) => {
    // Going once they turn away or out of the grid (passing under the headline
    // is fine: they only come in clear of it).
    for (const country of picked) if (facingShare(country) < 0.2 || !inSight(country, 0, false)) going(country, now)
    picked = picked.filter((country) => {
      const dying = life.get(country)?.dying
      if (dying !== undefined && now - dying > FADE_MS) {
        life.delete(country)
        routes = routes.filter((route) => route.from !== country && route.to !== country)
        recent = [country, ...recent].slice(0, 8)
        return false
      }
      return true
    })
    if (reducedMotion || live().length >= count || now - lastAdded < APPEAR_GAP_MS) return
    const coming = sizeable.filter((country) => !picked.includes(country) && !recent.includes(country) && facingShare(country) > 0.2 && inSight(country) && apart(country))
    const next = coming[Math.floor(Math.random() * coming.length)]
    if (!next) return
    picked.push(next)
    life.set(next, { born: now })
    lastAdded = now
    if (previous && live().includes(previous) && previous !== next) routes.push({ from: next, to: previous, born: now })
    previous = next
  }

  const draw = () => {
    const now = performance.now()
    keepFacing(now)
    canvas.dataset.countries = picked.map((country) => country.name).join(', ')
    const r = globeRadius() * ratio
    const cx = width * centreX * ratio
    const cy = height * centreY * ratio
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (lines) lineCtx.clearRect(0, 0, lines.width, lines.height)
    // The disc's edge.
    lineCtx.fillStyle = tone('#9a9a9a', '#8c8c8c')
    const rim = Array.from({ length: 721 }, (_, i) => i * 0.5)
    for (const deg of rim) {
      if ((deg * 2) % 3) continue
      lineCtx.fillRect(cx + Math.cos(deg * RAD) * r - 1.25 * ratio, cy + Math.sin(deg * RAD) * r - 1.25 * ratio, 2.5 * ratio, 2.5 * ratio)
    }
    // Graticule.
    lineCtx.fillStyle = tone('#a8a8a8', '#7a7a7a')
    for (const line of [...meridians, ...parallels]) dotLine(line, cx, cy, r, 6 * ratio, 2.2 * ratio)
    // The picked countries, in silver, no edge.
    for (const country of picked) fillShape(country.rings, cx, cy, r, fadeOf(country, now))
    // Their routes, drawing out.
    lineCtx.fillStyle = tone('#6f6f6f', '#b4b4b4')
    for (const route of routes) {
      const grow = Math.min(1, (now - route.born) / ROUTE_MS)
      const eased = 1 - (1 - grow) ** 3
      const arc = greatCircle(route.from.centre, route.to.centre, 96)
      lineCtx.globalAlpha = Math.min(fadeOf(route.from, now), fadeOf(route.to, now))
      dotLine(arc.slice(0, Math.max(2, Math.round(arc.length * eased))), cx, cy, r, 4 * ratio, 1.8 * ratio)
    }
    lineCtx.globalAlpha = 1
    // Their marks: a cross at the centre, the name and where it is.
    lineCtx.font = `${10 * ratio}px 'ABC Areal Mono', monospace`
    lineCtx.textBaseline = 'top'
    const ink = tone('#6a6a6a', '#b8b8b8')
    for (const country of picked) {
      const alpha = fadeOf(country, now)
      const [x, y, front] = project(country.centre[0], country.centre[1], cx, cy, r)
      if (!front || !alpha) continue
      lineCtx.globalAlpha = alpha
      lineCtx.fillStyle = ink
      const arm = 5 * ratio
      lineCtx.fillRect(x - arm, y - 0.5 * ratio, arm * 2, ratio)
      lineCtx.fillRect(x - 0.5 * ratio, y - arm, ratio, arm * 2)
      const [lon, lat] = country.centre
      const where = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`
      lineCtx.fillText(country.name.toUpperCase(), x + 8 * ratio, y + 6 * ratio)
      lineCtx.fillText(where, x + 8 * ratio, y + 18 * ratio)
    }
    lineCtx.globalAlpha = 1
  }

  let frame = 0
  let last = performance.now()
  let stopped = false
  const loop = (now: number) => {
    if (stopped) return
    lon0 = (lon0 + (spin * (now - last)) / 1000) % 360
    last = now
    draw()
    frame = requestAnimationFrame(loop)
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) draw()
  else frame = requestAnimationFrame(loop)

  return {
    // New countries (on each headline).
    // With each headline, the one there longest goes (another follows, in turn).
    shuffle() {
      if (reducedMotion || live().length < count) return
      const oldest = live().sort((a, b) => life.get(a)!.born - life.get(b)!.born)[0]
      if (oldest) going(oldest, performance.now())
    },
    resize() {
      resizeAll()
      draw()
    },
    stop() {
      stopped = true
      cancelAnimationFrame(frame)
    },
  }
}

// Points along the shorter great circle from one place to another.
function greatCircle(from: [number, number], to: [number, number], steps: number): [number, number][] {
  const vec = ([lon, lat]: [number, number]) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)]
  const a = vec(from)
  const b = vec(to)
  const angle = Math.acos(Math.min(1, Math.max(-1, a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!)))
  if (angle < 1e-6) return [from, to]
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const ka = Math.sin((1 - t) * angle) / Math.sin(angle)
    const kb = Math.sin(t * angle) / Math.sin(angle)
    const x = ka * a[0]! + kb * b[0]!
    const y = ka * a[1]! + kb * b[1]!
    const z = ka * a[2]! + kb * b[2]!
    return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD] as [number, number]
  })
}
