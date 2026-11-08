// /?splash=globe: a globe turning slowly behind the white splash, as graphic
// composition (after the "Open Structures" poster): its graticule in grey
// dotted lines, every coast in fainter dots, and a few countries here and
// there in silver foil. Orthographic, drawn on a canvas, by hand (no
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
  const { radius = 1, centreX = 0.5, centreY = 0.5, spin = 2.4, tilt = 24, countries: count = 9, avoid = () => [], lines } = options
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
  const grey = (hex: string) => (lines ? `#${(0xFFFFFF - Number.parseInt(hex.slice(1), 16)).toString(16).padStart(6, '0')}` : hex)
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
  // The countries are cut from one sheet of silver (silverSheet), wider than
  // the canvas, gliding sideways as the globe turns: the light runs on across
  // them, as on a foil print.
  let sheet: HTMLCanvasElement | null = null
  const resizeAll = () => {
    resize()
    sheet = silverSheet(canvas.width * 1.6, canvas.height, ratio)
  }
  resizeAll()

  let lon0 = Math.random() * 360
  let picked: Country[] = []
  // Where a country's centre lands now (px), and whether it's in sight: on
  // our side, inside the canvas, clear of what lies over it.
  const inSight = (country: Country, margin = 40) => {
    const r = globeRadius()
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
          lineCtx.fillRect(prev[0] + (dx * d) / length - size / 2, prev[1] + (dy * d) / length - size / 2, size, size)
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
    if (!sheet) return
    ctx.save()
    ctx.clip('evenodd')
    // Sliding with the turn, back and forth (never off its edge).
    const travel = sheet.width - canvas.width
    const shift = ((Math.sin((lon0 * RAD) / 2) + 1) / 2) * travel
    ctx.drawImage(sheet, -shift, 0)
    ctx.restore()
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
    const r = globeRadius() * ratio
    const cx = width * centreX * ratio
    const cy = height * centreY * ratio
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (lines) lineCtx.clearRect(0, 0, lines.width, lines.height)
    // The disc's edge.
    lineCtx.fillStyle = grey('#9a9a9a')
    const rim = Array.from({ length: 721 }, (_, i) => i * 0.5)
    for (const deg of rim) {
      if ((deg * 2) % 3) continue
      lineCtx.fillRect(cx + Math.cos(deg * RAD) * r - 1.25 * ratio, cy + Math.sin(deg * RAD) * r - 1.25 * ratio, 2.5 * ratio, 2.5 * ratio)
    }
    // Graticule.
    lineCtx.fillStyle = grey('#a8a8a8')
    for (const line of [...meridians, ...parallels]) dotLine(line, cx, cy, r, 6 * ratio, 2.2 * ratio)
    // The picked countries, in silver foil, edged in dots.
    for (const country of picked) fillShape(country.rings, cx, cy, r)
    lineCtx.fillStyle = grey('#7a7a7a')
    for (const country of picked) for (const ring of country.rings) dotLine(ring, cx, cy, r, 3 * ratio, 1.6 * ratio)
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
      resizeAll()
      draw()
    },
    stop() {
      stopped = true
      cancelAnimationFrame(frame)
    },
  }
}

// A sheet of polished silver, as liquid-metal shaders do it (Paper's Liquid
// Metal, shaders.com's Chrome): a gently rippling surface, each point
// reflecting a studio "environment" (bright sky, a sharp dark horizon, a
// darker floor) by its slope, so the light falls into true highlights and
// reflections; then a fine brushed grain. Worked out at half size (it's all
// soft), the grain at full.
const CHROME: [number, [number, number, number]][] = [
  [-1, [62, 64, 68]],
  [-0.45, [108, 111, 116]],
  [-0.12, [150, 153, 158]],
  [-0.03, [52, 54, 58]],
  [0.02, [236, 238, 241]],
  [0.12, [255, 255, 255]],
  [0.35, [206, 209, 213]],
  [0.7, [172, 175, 180]],
  [1, [196, 199, 203]],
]
function chrome(t: number) {
  for (let i = 1; i < CHROME.length; i++) {
    const [b, cb] = CHROME[i]!
    if (t <= b) {
      const [a, ca] = CHROME[i - 1]!
      const f = (t - a) / (b - a)
      return [ca[0] + (cb[0] - ca[0]) * f, ca[1] + (cb[1] - ca[1]) * f, ca[2] + (cb[2] - ca[2]) * f]
    }
  }
  return CHROME[CHROME.length - 1]![1]
}
function silverSheet(w: number, h: number, ratio: number) {
  const sheet = document.createElement('canvas')
  sheet.width = Math.max(1, Math.round(w))
  sheet.height = Math.max(1, Math.round(h))
  const W = sheet.width
  const H = sheet.height
  // The surface: a few long waves, each its own way (px of the sheet).
  const waves = Array.from({ length: 7 }, (_, k) => {
    const angle = -0.6 + (Math.random() - 0.5) * 1.4
    const length = (180 + Math.random() * 520) * ratio * (k < 2 ? 1.8 : 1)
    return { kx: (Math.cos(angle) * Math.PI * 2) / length, ky: (Math.sin(angle) * Math.PI * 2) / length, phase: Math.random() * Math.PI * 2, height: (k < 2 ? 1.6 : 1) * (0.5 + Math.random() * 0.5) }
  })
  const steep = 0.5
  const half = document.createElement('canvas')
  const hw = Math.max(1, Math.round(W / 2))
  const hh = Math.max(1, Math.round(H / 2))
  half.width = hw
  half.height = hh
  const hg = half.getContext('2d')!
  const image = hg.createImageData(hw, hh)
  const data = image.data
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const px = x * 2
      const py = y * 2
      // Its slope here.
      let dx = 0
      let dy = 0
      for (const wave of waves) {
        const c = Math.cos(wave.kx * px + wave.ky * py + wave.phase) * wave.height
        dx += c * wave.kx
        dy += c * wave.ky
      }
      dx *= 220 * steep * ratio
      dy *= 220 * steep * ratio
      // The normal, and the view reflected in it: up/down picks the sky, the
      // horizon or the floor; sideways leans it a little.
      const length = Math.hypot(dx, dy, 1)
      const ny = -dy / length
      const nx = -dx / length
      const nz = 1 / length
      const ry = 2 * nz * ny
      const rx = 2 * nz * nx
      const t = Math.max(-1, Math.min(1, ry * 0.9 + rx * 0.25 + (0.5 - y / hh) * 0.35))
      const [r, g, b] = chrome(t)
      const i = (y * hw + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  hg.putImageData(image, 0, 0)
  const g = sheet.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(half, 0, 0, W, H)
  // Brushed grain, along the light.
  g.save()
  g.translate(W / 2, H / 2)
  g.rotate(-0.6)
  const reach = Math.hypot(W, H) / 2
  for (let i = 0; i < (W * H) / (1400 * ratio); i++) {
    g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(30,32,35,0.05)'
    g.lineWidth = (0.4 + Math.random() * 0.8) * ratio
    const x = (Math.random() * 2 - 1) * reach
    const y = (Math.random() * 2 - 1) * reach
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (40 + Math.random() * 260) * ratio, y)
    g.stroke()
  }
  g.restore()
  return sheet
}
