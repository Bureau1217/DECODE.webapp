// /?splash=globe: a globe turning slowly behind the white splash, as graphic
// composition (after the "Open Structures" poster): its graticule in grey
// dotted lines, every coast in fainter dots, and a few countries here and
// there in a silver halftone. Orthographic, drawn on a canvas, by hand (no
// geo library): the far side is left out, a line breaking where it goes over
// the edge.

type Ring = [number, number][]
type Country = { name: string, rings: Ring[], centre: [number, number] }

export type GlobeOptions = {
  // Of the canvas's shorter side.
  radius?: number
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
  const { radius = 1.05, centreX = 0.56, centreY = 0.78, spin = 2.4, tilt = 24, countries: count = 9, avoid = () => [] } = options
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
  let width = 0
  let height = 0
  let ratio = 1
  const resize = () => {
    ratio = Math.min(2, window.devicePixelRatio || 1)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }
  resize()

  // The halftone: grey dots on a silver ground, as a repeating tile.
  const tile = document.createElement('canvas')
  const tileSize = Math.round(6 * ratio)
  tile.width = tile.height = tileSize
  const t = tile.getContext('2d')!
  t.fillStyle = '#d4d4d4'
  t.fillRect(0, 0, tileSize, tileSize)
  t.fillStyle = '#8a8a8a'
  t.beginPath()
  t.arc(tileSize / 2, tileSize / 2, tileSize * 0.34, 0, Math.PI * 2)
  t.fill()
  const halftone = ctx.createPattern(tile, 'repeat')!

  let lon0 = Math.random() * 360
  let picked: Country[] = []
  // Where a country's centre lands now (px), and whether it's in sight: on
  // our side, inside the canvas, clear of what lies over it.
  const inSight = (country: Country, margin = 40) => {
    const r = Math.min(width, height) * radius
    const [x, y, front] = project(country.centre[0], country.centre[1], width * centreX, height * centreY, r)
    if (!front || x < 0 || y < 0 || x > width || y > height) return false
    return avoid().every((box) => x < box.left - margin || x > box.right + margin || y < box.top - margin || y > box.bottom + margin)
  }
  const apart = (country: Country) => picked.every((other) => Math.hypot(other.centre[0] - country.centre[0], other.centre[1] - country.centre[1]) > 16)
  // A few on the side facing us, in sight, apart from one another.
  const pick = () => {
    picked = []
    for (const country of sizeable.filter((c) => inSight(c)).sort(() => Math.random() - 0.5)) {
      if (picked.length >= count) break
      if (apart(country)) picked.push(country)
    }
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
          ctx.fillRect(prev[0] + (dx * d) / length - size / 2, prev[1] + (dy * d) / length - size / 2, size, size)
          d += gap
        }
        carry = d - length
      }
      prev = at
    }
  }
  const fillShape = (rings: Ring[], cx: number, cy: number, r: number) => {
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
    ctx.fill('evenodd')
  }

  pick()

  const meridians = Array.from({ length: 24 }, (_, k) => Array.from({ length: 73 }, (_, i) => [k * 15, -90 + i * 2.5] as [number, number]))
  const parallels = Array.from({ length: 11 }, (_, k) => Array.from({ length: 145 }, (_, i) => [-180 + i * 2.5, -75 + k * 15] as [number, number]))

  // As they turn out of sight, one at a time gives way to another coming in.
  const facingShare = (country: Country) => Math.cos(country.centre[1] * RAD) * Math.cos((country.centre[0] + lon0) * RAD)
  const keepFacing = () => {
    const going = picked.findIndex((country) => facingShare(country) < 0.2 || !inSight(country, 0))
    if (going >= 0) picked.splice(going, 1)
    if (picked.length >= count) return
    const coming = sizeable.filter((country) => !picked.includes(country) && facingShare(country) > 0.2 && inSight(country) && apart(country))
    const next = coming[Math.floor(Math.random() * coming.length)]
    if (next) picked.push(next)
  }

  const draw = () => {
    keepFacing()
    canvas.dataset.countries = picked.map((country) => country.name).join(', ')
    const r = Math.min(width, height) * radius * ratio
    const cx = width * centreX * ratio
    const cy = height * centreY * ratio
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // The disc's edge.
    ctx.fillStyle = '#9a9a9a'
    const rim = Array.from({ length: 721 }, (_, i) => i * 0.5)
    for (const deg of rim) {
      if ((deg * 2) % 3) continue
      ctx.fillRect(cx + Math.cos(deg * RAD) * r - 1.25 * ratio, cy + Math.sin(deg * RAD) * r - 1.25 * ratio, 2.5 * ratio, 2.5 * ratio)
    }
    // Graticule.
    ctx.fillStyle = '#a8a8a8'
    for (const line of [...meridians, ...parallels]) dotLine(line, cx, cy, r, 6 * ratio, 2.2 * ratio)
    // The picked countries, in halftone, edged in dots.
    ctx.fillStyle = halftone
    for (const country of picked) fillShape(country.rings, cx, cy, r)
    ctx.fillStyle = '#7a7a7a'
    for (const country of picked) for (const ring of country.rings) dotLine(ring, cx, cy, r, 3 * ratio, 1.6 * ratio)
    // Every other coast, fainter.
    ctx.fillStyle = '#c8c8c8'
    for (const country of world) if (!picked.includes(country)) for (const ring of country.rings) dotLine(ring, cx, cy, r, 4 * ratio, 1.4 * ratio)
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
    shuffle() {
      pick()
      if (reduced) draw()
    },
    resize() {
      resize()
      draw()
    },
    stop() {
      stopped = true
      cancelAnimationFrame(frame)
    },
  }
}
