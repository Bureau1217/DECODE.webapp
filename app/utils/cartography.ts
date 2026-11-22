// /?splash=uncertainty: "Mapping uncertainty", an experimental cartography
// (SplashCartography.vue). The world as an instrument would draw it, an
// orthographic globe seen from far off, its limb an arc across the screen,
// covered in measurements; and over it, a set of campaign events whose
// certainty is drawn into the lines themselves:
// - verified: a continuous line, a sharp point;
// - unconfirmed: a broken, flickering trajectory;
// - missing: the line stops, a gap, the line resumes;
// - contradictory: two competing lines, in the one warm colour.
// An event's origin is never a point unless it is known: a cloud of
// probability, its contours dotted. Some territories carry no record at all
// (LACUNAE): every layer stops at their edge.
//
// ALL OF ITS EVENTS, NODES, ROUTES AND PROBABILITIES ARE SYNTHETIC
// (generated here from a fixed seed): a demonstration of the visual system,
// not an investigation. The geography (the countries) is real.

export type Certainty = 'verified' | 'unconfirmed' | 'missing' | 'contradictory'
export type LayerKey = 'accounts' | 'media' | 'circulation'
export const LAYERS: { key: LayerKey, label: string, note: string }[] = [
  { key: 'accounts', label: 'Account metadata', note: 'origins inferred from account creation and posting patterns' },
  { key: 'media', label: 'Media forensics', note: 'origins inferred from file metadata, compression and earliest copies' },
  { key: 'circulation', label: 'Circulation', note: 'origins inferred from the order in which copies appeared' },
]

type LonLat = [number, number]
type Ring = LonLat[]
export type Hypothesis = { lon: number, lat: number, sx: number, sy: number, p: number }
export type Route = { target: number, from: 0 | 1, cert: Certainty }
export type Evidence = { k: string, v: string, cert: Certainty }
export type EventLayer = { origins: [Hypothesis, Hypothesis], routes: Route[], evidence: Evidence[] }
export type CampaignEvent = {
  id: string
  title: string
  kind: string
  targets: number[]
  layers: Record<LayerKey, EventLayer>
  // Synthetic volumes (posts per relay cluster), for the radial index.
  volumes: number[]
  first: string
}
export type MapNode = { id: string, lon: number, lat: number, micro: Float32Array }
export type Lacuna = { id: string, lon: number, lat: number, r: number }

const RAD = Math.PI / 180

// ---- Seeded randomness ----
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r())
}

// ---- Geometry on the sphere ----
function toVec(lon: number, lat: number): [number, number, number] {
  const l = lon * RAD
  const p = lat * RAD
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]
}
function toLonLat(v: [number, number, number]): LonLat {
  return [Math.atan2(v[1], v[0]) / RAD, Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD]
}
export function angularDistance(a: LonLat, b: LonLat) {
  const va = toVec(a[0], a[1])
  const vb = toVec(b[0], b[1])
  return Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))) / RAD
}
// Points along the great circle from a to b.
export function greatCircle(a: LonLat, b: LonLat, n: number): LonLat[] {
  const va = toVec(a[0], a[1])
  const vb = toVec(b[0], b[1])
  const d = Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])))
  if (d < 1e-6) return [a, b]
  const s = Math.sin(d)
  const out: LonLat[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const k1 = Math.sin((1 - t) * d) / s
    const k2 = Math.sin(t * d) / s
    out.push(toLonLat([k1 * va[0] + k2 * vb[0], k1 * va[1] + k2 * vb[1], k1 * va[2] + k2 * vb[2]]))
  }
  return out
}

// ---- The view: an orthographic projection, rotated, scaled ----
// Two projections: orthographic (the globe from far off, `r` its radius),
// or azimuthal equidistant (/?splash=ice: the oceans as one mass round the
// view's centre, cut off `cMax` degrees out, `r` that edge's radius).
export type View = { lon: number, lat: number, scale: number, cx: number, cy: number, r: number, mode?: 'ortho' | 'azeq', cMax?: number }
// A point on screen (x, y), its depth (> 0 shown: on the near side, or
// inside the cut); `lift` raises it off the surface (arcs).
export function project(view: View, lon: number, lat: number, lift = 0) {
  const l = (lon - view.lon) * RAD
  const p = lat * RAD
  const p0 = view.lat * RAD
  const cosp = Math.cos(p)
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * cosp * Math.cos(l)
  const sx = cosp * Math.sin(l)
  const sy = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * cosp * Math.cos(l)
  if (view.mode === 'azeq') {
    const cMax = (view.cMax ?? 120) * RAD
    const c = Math.acos(Math.max(-1, Math.min(1, cosc)))
    const k = c < 1e-9 ? 1 : c / Math.sin(c)
    const R = (view.r / cMax) * (1 + lift)
    return { x: view.cx + R * k * sx, y: view.cy - R * k * sy, depth: (cMax - c) / cMax }
  }
  const R = view.r * (1 + lift)
  return { x: view.cx + R * sx, y: view.cy - R * sy, depth: cosc }
}
export function invert(view: View, x: number, y: number): LonLat | null {
  const dx = (x - view.cx) / view.r
  const dy = -(y - view.cy) / view.r
  const rho = Math.hypot(dx, dy)
  if (rho > 1) return null
  if (rho < 1e-9) return [view.lon, view.lat]
  const c = view.mode === 'azeq' ? rho * (view.cMax ?? 120) * RAD : Math.asin(rho)
  const p0 = view.lat * RAD
  const lat = Math.asin(Math.cos(c) * Math.sin(p0) + (dy * Math.sin(c) * Math.cos(p0)) / rho)
  const lon = view.lon * RAD + Math.atan2(dx * Math.sin(c), rho * Math.cos(c) * Math.cos(p0) - dy * Math.sin(c) * Math.sin(p0))
  let lonDeg = lon / RAD
  lonDeg = ((lonDeg + 540) % 360) - 180
  return [lonDeg, lat / RAD]
}

// ---- The world ----
export type Country = { name: string, rings: Ring[], bbox: [number, number, number, number] }
export async function loadWorld(): Promise<Country[]> {
  const data = (await import('~/data/world-countries.json')).default as { features: { properties: { name: string }, geometry: { type: string, coordinates: unknown } }[] }
  return data.features.map((feature) => {
    const polygons = (feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates) as Ring[][]
    const rings = polygons.flat()
    let minX = 180, minY = 90, maxX = -180, maxY = -90
    for (const ring of rings) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    return { name: feature.properties.name, rings, bbox: [minX, minY, maxX, maxY] }
  })
}
function inRing(ring: Ring, x: number, y: number) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
export function onLand(world: Country[], lon: number, lat: number) {
  for (const c of world) {
    const b = c.bbox
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue
    let inside = false
    for (const ring of c.rings) if (inRing(ring, lon, lat)) inside = !inside
    if (inside) return true
  }
  return false
}

// A smooth field over the sphere (sums of waves): the measurement traffic's
// currents, and where the record is dense or thin.
function field(lon: number, lat: number) {
  const l = lon * RAD
  const p = lat * RAD
  const u = Math.sin(p * 3.1 + Math.cos(l * 2.0) * 1.3) + 0.6 * Math.cos(l * 3.7 - p * 2.2) + 0.35 * Math.sin(l * 7.1 + p * 5.3)
  const v = Math.cos(l * 2.3 + Math.sin(p * 2.7) * 1.1) + 0.5 * Math.sin(p * 4.9 + l * 1.7) + 0.3 * Math.cos(l * 6.3 - p * 6.1)
  return [u, v] as const
}
// 0 (no record) … 1 (densely documented): synthetic coverage.
export function coverage(lon: number, lat: number) {
  const l = lon * RAD
  const p = lat * RAD
  const n = 0.5 + 0.28 * Math.sin(l * 1.7 + 0.9) * Math.cos(p * 2.3 - 0.4) + 0.18 * Math.sin(l * 4.3 - p * 3.1) + 0.1 * Math.cos(l * 9.1 + p * 7.7)
  return Math.max(0, Math.min(1, n))
}

export type Zone = { id: string, lon: number, lat: number, r: number, sides: number, turn: number }
export type Synthetic = {
  traces: Float32Array[] // lon/lat pairs
  stipple: Float32Array // lon/lat pairs, on land
  sea: Float32Array // lon/lat pairs, at sea: the record's density
  coastal: Float32Array // lon/lat pairs, detections along the coasts
  zones: Zone[] // observation zones at sea (synthetic)
  nodes: MapNode[]
  events: CampaignEvent[]
  lacunae: Lacuna[]
  orbits: { inc: number, node: number, label: string }[]
}

// Approximate land anchors the synthetic nodes are scattered round
// (unnamed: regions, not places).
const ANCHORS: LonLat[] = [
  [2, 48], [13, 52], [21, 52], [30, 50], [37, 55], [28, 41], [31, 30], [3, 7], [-17, 14], [-4, 6],
  [-8, 13], [37, -1], [-0.1, 51.5], [-3.7, 40], [12.5, 42], [20.5, 44.8], [44.8, 41.7], [51, 35.7], [55, 25],
  [-74, 40.7], [-77, 38.9], [-46.6, -23.5], [-99, 19.4], [-51.7, 64.2], [77, 28.6], [116, 40], [139.7, 35.7],
  [18.4, -33.9], [-58.4, -34.6], [151, -33.8], [100.5, 13.7], [106.8, -6.2], [35, 32], [10, 36.8], [-6.8, 34],
  [24, 60], [10.7, 59.9], [-122.4, 37.8], [-87.6, 41.9], [69, 41], [67, 24.9], [90.4, 23.8], [32.5, 0.3], [7.5, 9],
]
const KINDS = [
  ['Deepfake', 'Fabricated video of an election official'],
  ['Voice clone', 'Cloned voice message circulated before a vote'],
  ['Cheapfake', 'Recycled protest footage, re-captioned'],
  ['Astroturfing', 'Burst of new accounts amplifying one hashtag'],
  ['Deepfake', 'Synthetic portrait used as a reporter\'s profile'],
  ['Doctored image', 'Altered satellite view of a border crossing'],
  ['Impostor site', 'News site mirroring a public broadcaster'],
  ['Deepfake', 'Generated image of a staged public event'],
  ['Cheapfake', 'Speech slowed down to suggest intoxication'],
  ['Astroturfing', 'Coordinated replies under a health notice'],
  ['Doctored map', 'Edited map of a disputed territory'],
  ['Voice clone', 'Fake phone call attributed to a mayor'],
  ['Impostor site', 'Cloned ministry page with a false decree'],
  ['Deepfake', 'Lip-synced interview in a second language'],
]
const EVIDENCE: Record<LayerKey, [string, string[]][]> = {
  accounts: [
    ['Account creation', ['cluster of {n} accounts in 48 h', '{n} accounts, dates spread over a year', 'creation dates withheld']],
    ['Posting rhythm', ['shared schedule across {n} accounts', 'no common rhythm found', 'rhythm matches two time zones']],
    ['Handles', ['sequential naming pattern', 'recycled handles, earlier owners unknown', 'no pattern']],
  ],
  media: [
    ['Earliest copy', ['traced to one upload', 'two uploads claim to be first', 'earliest copy not found']],
    ['File metadata', ['intact, consistent', 'stripped on upload', 'edited after capture']],
    ['Generation traces', ['consistent with a known generator', 'inconclusive', 'two detectors disagree']],
  ],
  circulation: [
    ['First appearance', ['one platform, then mirrored', 'simultaneous on three platforms', 'gap of {n} h unaccounted for']],
    ['Relay order', ['reconstructed end to end', 'partly reconstructed', 'contradicted by timestamps']],
    ['Reach', ['{n}k shares measured', 'estimated only', 'platform data unavailable']],
  ],
}
const CERT_FOR_PICK: Certainty[] = ['verified', 'unconfirmed', 'missing']

export function makeSynthetic(world: Country[], seed = 20261113): Synthetic {
  const r = rng(seed)
  // Lacunae: regions with no record.
  const lacunae: Lacuna[] = [
    { id: 'L-01', lon: 22, lat: 4, r: 7 },
    { id: 'L-02', lon: 48, lat: 23, r: 5.5 },
    { id: 'L-03', lon: 95, lat: 62, r: 9 },
    { id: 'L-04', lon: -62, lat: -8, r: 6.5 },
    { id: 'L-05', lon: 8, lat: 62, r: 2.6 },
  ]
  const inLacuna = (lon: number, lat: number) => lacunae.some((l) => angularDistance([lon, lat], [l.lon, l.lat]) < l.r)

  // Measurement traces: streamlines of the field, broken off where there's
  // no record (coverage), so whole regions stay empty.
  const traces: Float32Array[] = []
  for (let i = 0; i < 7000; i++) {
    let lon = r() * 360 - 180
    let lat = Math.asin(r() * 2 - 1) / RAD
    if (coverage(lon, lat) < 0.47) continue
    const pts: number[] = []
    const steps = 30 + Math.floor(r() * 90)
    const dir = r() < 0.5 ? 1 : -1
    for (let s = 0; s < steps; s++) {
      pts.push(lon, lat)
      const [u, v] = field(lon, lat)
      const m = Math.hypot(u, v) || 1
      lon += (dir * 0.55 * u) / m / Math.max(0.25, Math.cos(lat * RAD))
      lat += (dir * 0.55 * v) / m
      if (lat > 84 || lat < -84) break
      if (lon > 180) lon -= 360
      if (lon < -180) lon += 360
      if (coverage(lon, lat) < 0.4 || inLacuna(lon, lat)) break
    }
    if (pts.length > 8) traces.push(new Float32Array(pts))
  }

  // Land texture: points on land, thinned where coverage is low; at sea,
  // the same, much denser where it's dense, near none where it's not.
  const stip: number[] = []
  const sea: number[] = []
  for (let i = 0; i < 240000; i++) {
    const lon = r() * 360 - 180
    const lat = Math.asin(r() * 2 - 1) / RAD
    const cov = coverage(lon, lat)
    const keepLand = lat > -60 && r() < 0.25 + cov * 0.9
    const keepSea = r() < cov ** 3 * 1.1
    if (!keepLand && !keepSea) continue
    if (onLand(world, lon, lat)) { if (keepLand) stip.push(lon, lat) } else if (keepSea && !inLacuna(lon, lat)) sea.push(lon, lat)
  }
  // Detections along the coasts: clusters off their points, where the
  // record is dense.
  const coastal: number[] = []
  for (const country of world) {
    for (const ring of country.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        const [lon, lat] = ring[i]!
        const cov = coverage(lon, lat)
        if (r() > cov ** 2 * 1.4) continue
        const n = 3 + Math.floor(r() * 14 * cov)
        for (let k = 0; k < n; k++) {
          const a = lon + gauss(r) * 0.5
          const b = lat + gauss(r) * 0.35
          // (At sea only: a country's ring runs along its land borders too.)
          if (!inLacuna(a, b) && !onLand(world, a, b)) coastal.push(a, b)
        }
      }
    }
  }
  // Observation zones at sea: circles and polygons, synthetic.
  const zones: Zone[] = []
  while (zones.length < 34) {
    const lon = r() * 360 - 180
    const lat = Math.asin(r() * 1.7 - 0.85) / RAD
    if (onLand(world, lon, lat) || inLacuna(lon, lat)) continue
    zones.push({ id: `Z-${String(zones.length + 1).padStart(2, '0')}`, lon, lat, r: 0.8 + r() ** 2 * 4.5, sides: r() < 0.45 ? 0 : 4 + Math.floor(r() * 4), turn: r() * Math.PI })
  }

  // (None inside a lacuna.)
  const kept: number[] = []
  for (let i = 0; i < stip.length; i += 2) {
    if (!inLacuna(stip[i]!, stip[i + 1]!)) kept.push(stip[i]!, stip[i + 1]!)
  }

  // Nodes: scattered round the anchors, each with its micro-detections.
  const nodes: MapNode[] = []
  for (let i = 0; i < 64; i++) {
    const a = ANCHORS[i % ANCHORS.length]!
    const lon = a[0] + gauss(r) * 2.2
    const lat = a[1] + gauss(r) * 1.6
    if (inLacuna(lon, lat)) continue
    const count = 20 + Math.floor(r() ** 2 * 260)
    const spread = 0.4 + r() * 1.8
    const micro = new Float32Array(count * 2)
    for (let k = 0; k < count; k++) {
      micro[k * 2] = lon + gauss(r) * spread
      micro[k * 2 + 1] = lat + gauss(r) * spread * 0.7
    }
    nodes.push({ id: `N-${String(1000 + Math.floor(r() * 8999))}`, lon, lat, micro })
  }

  // Events.
  const events: CampaignEvent[] = KINDS.map(([kind, title], e) => {
    const targetCount = 3 + Math.floor(r() * 5)
    const targets: number[] = []
    while (targets.length < targetCount) {
      const t = Math.floor(r() * nodes.length)
      if (!targets.includes(t)) targets.push(t)
    }
    // A home region for its origins.
    const home = nodes[Math.floor(r() * nodes.length)]!
    const contradictory = e % 4 === 1
    const layers = {} as Record<LayerKey, EventLayer>
    for (const [li, layer] of LAYERS.entries()) {
      // Each layer places the two hypotheses differently: switching layers
      // moves the origin, sometimes far.
      const drift = layer.key === 'accounts' ? 0 : (layer.key === 'media' ? 6 + r() * 20 : 3 + r() * 9)
      const h1: Hypothesis = { lon: home.lon + gauss(r) * drift, lat: home.lat + gauss(r) * drift * 0.5, sx: 1 + r() * 4, sy: 0.8 + r() * 2.5, p: 0 }
      const far = nodes[Math.floor(r() * nodes.length)]!
      const h2: Hypothesis = { lon: far.lon + gauss(r) * 3, lat: far.lat + gauss(r) * 2, sx: 1.5 + r() * 5, sy: 1 + r() * 3, p: 0 }
      let p1 = contradictory ? 0.42 + r() * 0.08 : 0.55 + r() * 0.4
      if (li === 2 && e % 5 === 0) p1 = 0.3 + r() * 0.1
      h1.p = p1
      h2.p = Math.max(0.03, (1 - p1) * (contradictory ? 0.92 : 0.3 + r() * 0.5))
      const routes: Route[] = targets.map((target) => {
        const pick = r()
        let cert: Certainty = pick < 0.34 ? 'verified' : pick < 0.78 ? 'unconfirmed' : 'missing'
        if (p1 < 0.5 && pick < 0.34) cert = 'unconfirmed'
        let from: 0 | 1 = 0
        if (contradictory && r() < 0.5) { from = 1; cert = 'contradictory' }
        return { target, from, cert }
      })
      if (contradictory && !routes.some((x) => x.cert === 'contradictory')) routes[0] = { ...routes[0]!, from: 1, cert: 'contradictory' }
      const evidence: Evidence[] = EVIDENCE[layer.key].map(([k, options]) => {
        const i = Math.floor(r() * options.length)
        const v = options[i]!.replace('{n}', String(Math.floor(12 + r() * 400)))
        return { k, v, cert: contradictory && i === 1 ? 'contradictory' : CERT_FOR_PICK[i]! }
      })
      layers[layer.key] = { origins: [h1, h2], routes, evidence }
    }
    const volumes = Array.from({ length: 8 + Math.floor(r() * 12) }, () => r() ** 1.6)
    const day = 1 + Math.floor(r() * 27)
    const month = 1 + Math.floor(r() * 12)
    return {
      id: `SYN-${String(e + 1).padStart(2, '0')}`,
      kind,
      title,
      targets,
      layers,
      volumes,
      first: `20XX-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    }
  })

  const orbits = [
    { inc: 97.6, node: -38, label: 'PASS A · SUN-SYNC. 97.6°' },
    { inc: 53, node: 64, label: 'PASS B · 53.0°' },
    { inc: 70, node: 150, label: 'PASS C · 70.0°' },
  ]
  return { traces, stipple: new Float32Array(kept), sea: new Float32Array(sea), coastal: new Float32Array(coastal), zones, nodes, events, lacunae, orbits }
}

// A point on an orbit's ground track (a great circle inclined `inc` to the
// equator, crossing it northwards at `node`), at `t` (0–1 of a turn).
export function orbitPoint(inc: number, node: number, t: number): LonLat {
  const a = t * Math.PI * 2
  const i = inc * RAD
  const x = Math.cos(a)
  const y = Math.sin(a) * Math.cos(i)
  const z = Math.sin(a) * Math.sin(i)
  const n = node * RAD
  return toLonLat([x * Math.cos(n) - y * Math.sin(n), x * Math.sin(n) + y * Math.cos(n), z])
}

// Where the shown origin sits between two layers (a switch in progress).
export function mixHypothesis(a: Hypothesis, b: Hypothesis, t: number): Hypothesis {
  const k = t * t * (3 - 2 * t)
  let dl = b.lon - a.lon
  if (dl > 180) dl -= 360
  if (dl < -180) dl += 360
  return { lon: a.lon + dl * k, lat: a.lat + (b.lat - a.lat) * k, sx: a.sx + (b.sx - a.sx) * k, sy: a.sy + (b.sy - a.sy) * k, p: a.p + (b.p - a.p) * k }
}
