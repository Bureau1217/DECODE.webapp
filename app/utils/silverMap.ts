// The silver map, drawn in the browser: NASA's Blue Marble (its luminance) and
// which country each point is in, both in plain longitude/latitude
// (public/map-lab/, made from Natural Earth 10m inside Europe, 110m round it),
// reprojected pixel by pixel into any of a few projections, in a few tones,
// whole or only in parts (some countries, some of the grid's cells). Used by
// the map lab (pages/lab/map.vue) and the splash (Splash.vue, /?map=silver2 and
// /?map=lab&cfg=…).

export type Projection = 'laea' | 'orthographic' | 'stereographic' | 'equidistant' | 'gnomonic' | 'mercator' | 'equirect'
// card: the campaigns tool card's duotone (sea in the silver negative, land from
// it into a deep shade); card-negative: that inverted; negative: the site's
// plain silver negative (#duotone-silver); dark-negative: dark mode's; lines:
// no picture, only the coastlines, borders and graticule, in `ink`.
export type Tone = 'card' | 'card-negative' | 'negative' | 'dark-negative' | 'lines'
// The grid's lines over the map: white, dark, any colour (gridColor), or in
// difference (gridColor, white by default, inverting what's under them, so they
// show on light and dark alike).
export type GridLines = 'white' | 'dark' | 'color' | 'difference' | 'none'
// full: everything; countries: only some countries; cells: only some of the
// grid's cells; split: dark (card-negative) left of a line, light right of it.
export type Composition = 'full' | 'countries' | 'cells' | 'split'
// What shows of the countries that aren't picked (composition 'countries').
export type Others = 'hidden' | 'outline' | 'faint'

export interface SilverMapConfig {
  projection: Projection
  lon: number // the centre (degrees)
  lat: number
  zoom: number // px per radian, as a share of the shorter side
  rotate: number // degrees
  tone: Tone
  dark: string // the card tone's deep shade (hex)
  contrast: number // 1: as is
  grain: number // 0 to 1: how far it turns to a stipple, as printed
  composition: Composition
  countries: string[] // composition 'countries': these, or else `count` at random
  count: number
  others: Others
  cellShare: number // composition 'cells': of the cells, how many show it
  split: number // composition 'split': where the line is, of the width
  seed: number
  borders: boolean
  coast: boolean
  graticule: number // degrees between the lines, 0: none
  ink: 'light' | 'dark' // tone 'lines': the lines' colour
  nearTitle: number // composition 'countries', picked at random: 0 anywhere, 1 round the headline
  gridCols: number // the grid over it (the lab; on the splash too, /?map=lab)
  gridRows: number
  gridLines: GridLines
  gridColor: string // 'color' and 'difference'
  gridFrame: boolean // the second line round the grid (the splash's frame)
  frameStyle: 'line' | 'silver' // a thin grey line, or a band of brushed silver (SilverFrame.vue)
  frameGap: number // px between the grid and the frame
  frameWidth: number // silver: the band's thickness (px)
  frameContrast: number // silver: 0 flat to 1 bright highlights and deep shadows
  frameBands: number // silver: highlights along each side
}

export const SILVER_MAP_DEFAULTS: SilverMapConfig = {
  projection: 'laea',
  lon: 12,
  lat: 51,
  zoom: 0.2,
  rotate: 0,
  tone: 'card',
  dark: '#3a3b3e',
  contrast: 1,
  grain: 0,
  composition: 'full',
  countries: [],
  count: 6,
  others: 'hidden',
  cellShare: 0.4,
  split: 0.5,
  seed: 1,
  borders: true,
  coast: false,
  graticule: 0,
  ink: 'light',
  nearTitle: 0,
  gridCols: 6,
  gridRows: 4,
  gridLines: 'white',
  gridColor: '#ffffff',
  gridFrame: false,
  frameStyle: 'line',
  frameGap: 12,
  frameWidth: 8,
  frameContrast: 0.7,
  frameBands: 3,
}

// The countries picked at random (composition 'countries', no list given).
export const SILVER_MAP_POOL = [
  'France', 'Germany', 'Italy', 'Spain', 'Portugal', 'Poland', 'United Kingdom', 'Ireland', 'Norway', 'Sweden',
  'Finland', 'Denmark', 'Netherlands', 'Belgium', 'Austria', 'Switzerland', 'Czechia', 'Slovakia', 'Hungary',
  'Romania', 'Bulgaria', 'Greece', 'Croatia', 'Slovenia', 'Serbia', 'Bosnia and Herz.', 'Albania', 'Ukraine',
  'Moldova', 'Lithuania', 'Latvia', 'Estonia', 'Iceland',
]

export const SILVER_MAP_PRESETS: Record<string, Partial<SilverMapConfig>> = {
  'Whole (LAEA)': { zoom: 4 },
  'Fragments': { zoom: 4, composition: 'countries', count: 7, others: 'outline', borders: false, coast: false },
  'Cells': { zoom: 4, composition: 'cells', cellShare: 0.35 },
  'Split': { zoom: 4, composition: 'split', split: 0.42 },
  'Globe': { projection: 'orthographic', lon: 14, lat: 46, zoom: 0.95, graticule: 10, coast: true, borders: false },
  'Nullschool': { projection: 'stereographic', lon: 20, lat: 43, zoom: 1.35, graticule: 10, tone: 'card-negative', borders: false, coast: true },
  'Grain': { zoom: 4, tone: 'card', grain: 0.7, contrast: 1, borders: false, coast: true },
  'Gnomonic': { projection: 'gnomonic', lon: 12, lat: 52, zoom: 2.2, graticule: 5, borders: true },
  'Lines': { projection: 'stereographic', lon: 15, lat: 40, zoom: 0.9, tone: 'lines', ink: 'light', graticule: 10, borders: false, gridLines: 'difference' },
  'World': { projection: 'stereographic', lon: 20, lat: 10, zoom: 0.2, tone: 'lines', ink: 'light', graticule: 15, borders: false, gridLines: 'difference' },
  'Silver frame': { projection: 'stereographic', lon: 20, lat: 10, tone: 'card', graticule: 15, borders: false, coast: true, gridLines: 'none', gridFrame: true, frameStyle: 'silver', frameGap: 14, frameWidth: 10 },
  'Around the title': { zoom: 4, composition: 'countries', count: 8, nearTitle: 0.9, others: 'outline', borders: false, gridLines: 'difference' },
}

// Config ⇄ URL: only what differs from the defaults, as JSON in base64url.
export function encodeSilverMap(config: SilverMapConfig) {
  const diff = Object.fromEntries(Object.entries(config).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(SILVER_MAP_DEFAULTS[key as keyof SilverMapConfig])))
  return btoa(unescape(encodeURIComponent(JSON.stringify(diff)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function decodeSilverMap(text: string | null | undefined): SilverMapConfig {
  if (!text) return { ...SILVER_MAP_DEFAULTS }
  try {
    const json = decodeURIComponent(escape(atob(text.replace(/-/g, '+').replace(/_/g, '/'))))
    return { ...SILVER_MAP_DEFAULTS, ...JSON.parse(json) }
  }
  catch {
    return { ...SILVER_MAP_DEFAULTS }
  }
}

// One texture, over a box of longitude and latitude.
export interface SilverMapTile {
  lum: Uint8ClampedArray // one byte per texel
  ids: Uint8ClampedArray // country index + 1, 0: sea
  width: number
  height: number
  west: number
  north: number
  ppd: number // texels per degree
}
// The tiles, finest first: Europe and round it (24 per degree), then the
// whole world (10 per degree) for everywhere else.
export interface SilverMapData {
  tiles: SilverMapTile[]
  names: string[]
  landLo: number // the land's 1st and 99th percentile luminance (0 to 1)
  landHi: number
}

let loading: Promise<SilverMapData> | null = null
async function pixels(url: string) {
  const blob = await (await fetch(url)).blob()
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0)
  const rgba = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data
  const out = new Uint8ClampedArray(bitmap.width * bitmap.height)
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4]!
  return { data: out, width: bitmap.width, height: bitmap.height }
}
export function loadSilverMap() {
  loading ??= (async () => {
    const meta = await fetch('/map-lab/eq-meta.json').then((r) => r.json())
    const tiles: SilverMapTile[] = await Promise.all(meta.tiles.map(async (tile: { file: string, west: number, north: number, ppd: number }) => {
      const [lum, ids] = await Promise.all([pixels(`/map-lab/${tile.file}-lum.jpg`), pixels(`/map-lab/${tile.file}-ids.png`)])
      return { lum: lum.data, ids: ids.data, width: lum.width, height: lum.height, west: tile.west, north: tile.north, ppd: tile.ppd }
    }))
    // The land's tones, measured on the finest tile.
    const { lum, ids } = { lum: { data: tiles[0]!.lum }, ids: { data: tiles[0]!.ids } }
    const hist = new Array(256).fill(0)
    for (let i = 0; i < lum.data.length; i += 7) if (ids.data[i]) hist[lum.data[i]!]++
    const total = hist.reduce((a, b) => a + b, 0)
    const at = (share: number) => {
      let sum = 0
      for (let v = 0; v < 256; v++) {
        sum += hist[v]
        if (sum >= total * share) return v / 255
      }
      return 1
    }
    return { tiles, names: meta.names, landLo: at(0.01), landHi: at(0.99) }
  })()
  return loading
}

const RAD = Math.PI / 180
// From the projected plane (radians, y up) to longitude/latitude (degrees), or
// null where the projection doesn't reach.
export function inverter(config: Pick<SilverMapConfig, 'lon' | 'lat' | 'projection'>) {
  const lam0 = config.lon * RAD
  const phi0 = config.lat * RAD
  const sin0 = Math.sin(phi0)
  const cos0 = Math.cos(phi0)
  const azimuthal = (angle: (rho: number) => number | null) => (x: number, y: number): [number, number] | null => {
    const rho = Math.hypot(x, y)
    if (rho < 1e-9) return [config.lon, config.lat]
    const c = angle(rho)
    if (c === null) return null
    const sinc = Math.sin(c)
    const cosc = Math.cos(c)
    const phi = Math.asin(Math.max(-1, Math.min(1, cosc * sin0 + y * sinc * cos0 / rho)))
    const lam = lam0 + Math.atan2(x * sinc, rho * cos0 * cosc - y * sin0 * sinc)
    return [lam / RAD, phi / RAD]
  }
  switch (config.projection) {
    case 'orthographic': return azimuthal((rho) => (rho > 1 ? null : Math.asin(rho)))
    case 'stereographic': return azimuthal((rho) => 2 * Math.atan(rho / 2))
    case 'equidistant': return azimuthal((rho) => (rho > Math.PI ? null : rho))
    case 'gnomonic': return azimuthal((rho) => Math.atan(rho))
    case 'mercator': {
      const y0 = Math.log(Math.tan(Math.PI / 4 + phi0 / 2))
      return (x: number, y: number): [number, number] => [config.lon + x / RAD, (2 * Math.atan(Math.exp(y + y0)) - Math.PI / 2) / RAD]
    }
    case 'equirect': return (x: number, y: number): [number, number] => [config.lon + x / RAD, config.lat + y / RAD]
    default: return azimuthal((rho) => (rho > 2 ? null : 2 * Math.asin(rho / 2)))
  }
}

const hash = (x: number, y: number, seed: number) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function mulberry(seed: number) {
  let state = seed | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) || 0)

export interface Rect { x: number, y: number, w: number, h: number }

// The cells that show the map (composition 'cells'): `cellShare` of them, by seed.
export function pickCells(cells: Rect[], config: SilverMapConfig) {
  const rand = mulberry(config.seed * 7919 + 13)
  return cells.filter(() => rand() < config.cellShare)
}

// The countries shown (composition 'countries'), as indices + 1 in data.ids:
// the ones named, or `count` of the pool at random, among those on screen
// (`where`: each country's pixels there and their centre), the nearer the title
// the likelier with `nearTitle` (those it would hide count as a little away).
export function pickCountries(data: SilverMapData, config: SilverMapConfig, where?: Map<string, { count: number, x: number, y: number }>, title?: Rect, width = 1, height = 1) {
  let names = config.countries
  if (!names.length) {
    const rand = mulberry(config.seed * 104729 + 7)
    const diagonal = Math.hypot(width, height)
    // On screen enough to read (zoomed out on the world, Europe's countries
    // are specks: then the world's, too).
    const minimum = Math.max(40, width * height * 0.0004)
    const visible = (name: string) => !where || (where.get(name)?.count ?? 0) >= minimum
    const pool = SILVER_MAP_POOL.filter(visible)
    if (pool.length < config.count && where) {
      const more = [...where.keys()].filter((name) => !pool.includes(name) && visible(name) && name !== 'Antarctica')
        .sort((a, b) => where.get(b)!.count - where.get(a)!.count)
      pool.push(...more)
    }
    const keyed = pool.map((name) => {
      let weight = 1
      const at = where?.get(name)
      if (title && at && config.nearTitle > 0) {
        const cx = at.x / at.count
        const cy = at.y / at.count
        const dx = Math.max(title.x - cx, 0, cx - (title.x + title.w))
        const dy = Math.max(title.y - cy, 0, cy - (title.y + title.h))
        const distance = dx || dy ? Math.hypot(dx, dy) : diagonal * 0.12
        weight = 1 - config.nearTitle + config.nearTitle * Math.exp(-((distance / (diagonal * 0.14)) ** 2))
      }
      return { name, key: rand() ** (1 / Math.max(1e-4, weight)) }
    })
    names = keyed.sort((a, b) => b.key - a.key).slice(0, config.count).map(({ name }) => name)
  }
  const set = new Set<number>()
  data.names.forEach((name, index) => { if (names.includes(name)) set.add(index + 1) })
  return set
}

// Draws it: width × height px; `cells`: the grid's cells there, `title`: the
// headline's box (px).
export function renderSilverMap(data: SilverMapData, config: SilverMapConfig, width: number, height: number, { cells = [], title }: { cells?: Rect[], title?: Rect } = {}): ImageData {
  const out = new ImageData(width, height)
  const px = out.data
  const scale = config.zoom * Math.min(width, height)
  const invert = inverter(config)
  const rot = config.rotate * RAD
  const cr = Math.cos(rot)
  const sr = Math.sin(rot)
  const ids = new Int16Array(width * height).fill(-1) // -1: nothing there
  const tones = new Uint8ClampedArray(width * height)
  const grat = new Uint8Array(width * height) // 1: on the graticule
  const { landLo, landHi } = data
  const degPerPx = 1 / (scale * RAD)

  // The tones (0 to 255, grey) on a 256-step ramp per luminance, sea and land.
  const silver = (v: number) => 244 - (244 - 160) * v
  const deep = hexRgb(config.dark)
  const deepGrey = deep[0]! * 0.299 + deep[1]! * 0.587 + deep[2]! * 0.114
  const shadeGrey = deepGrey * 0.8 + 31 * 0.2 - 12
  const ramp = Math.max(0.06, (landHi - landLo) * 0.6)
  const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
  const seaRamp = new Uint8ClampedArray(256)
  const landRamp = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    const v = i / 255
    let sea: number
    let land: number
    if (config.tone === 'negative' || config.tone === 'dark-negative') {
      sea = land = config.tone === 'negative' ? silver(v) : 233 - (233 - 28) * v
    }
    else {
      sea = silver(v)
      const e = smooth((v - landLo) / ramp)
      const base = silver(Math.min(Math.max(v, landLo), landHi))
      land = e < 0.5 ? base + (deepGrey - base) * e * 2 * 0.85 : (base + (deepGrey - base) * 0.85) + (shadeGrey - (base + (deepGrey - base) * 0.85)) * (e - 0.5) * 2
      if (config.tone === 'card-negative') {
        sea = 255 - sea
        land = 255 - land
      }
    }
    const c = (t: number) => 128 + (t - 128) * config.contrast
    seaRamp[i] = c(sea)
    landRamp[i] = c(land)
  }

  const shown = config.composition === 'cells' ? pickCells(cells, config) : null
  const splitX = config.split * width

  // First pass: where each pixel falls, its country and its tone.
  for (let y = 0; y < height; y++) {
    // The last pixel's position: how many degrees a pixel spans here (the
    // graticule's lines one pixel wide wherever the projection stretches).
    let lastLon = NaN
    let lastLat = NaN
    for (let x = 0; x < width; x++) {
      const dx = (x + 0.5 - width / 2) / scale
      const dy = (height / 2 - y - 0.5) / scale
      const ll = invert(dx * cr + dy * sr, -dx * sr + dy * cr)
      if (!ll) continue
      let [lon, lat] = ll
      lon = ((lon + 540) % 360) - 180
      // The finest tile that has it.
      let tile: SilverMapTile | undefined
      let u = 0
      let v = 0
      for (const t of data.tiles) {
        u = (lon - t.west) * t.ppd
        v = (t.north - lat) * t.ppd
        if (u >= 0 && v >= 0 && u < t.width - 1 && v < t.height - 1) {
          tile = t
          break
        }
      }
      if (!tile) continue
      const { lum, width: tw } = tile
      const i = y * width + x
      const ui = u | 0
      const vi = v | 0
      const fu = u - ui
      const fv = v - vi
      const k = vi * tw + ui
      const l = (lum[k]! * (1 - fu) + lum[k + 1]! * fu) * (1 - fv) + (lum[k + tw]! * (1 - fu) + lum[k + tw + 1]! * fu) * fv
      const id = tile.ids[Math.round(v) * tw + Math.round(u)]!
      ids[i] = id
      let tone = id ? landRamp[l | 0]! : seaRamp[l | 0]!
      if (config.composition === 'split' && x < splitX) tone = 255 - tone
      if (config.grain > 0) {
        // A stipple: dark points as often as the tone is dark (the silver's own
        // range, 250 to 130, spread over none to all of them).
        const dot = hash(x, y, config.seed) < Math.min(1, Math.max(0, (250 - tone) / 120)) ? 46 : 238
        tone = tone + (dot - tone) * config.grain
      }
      tones[i] = tone
      if (config.graticule > 0) {
        const step = config.graticule
        const near = (a: number) => Math.abs(a - Math.round(a / step) * step)
        let dLon = Math.abs(lon - lastLon)
        if (dLon > 180) dLon = 360 - dLon
        const local = Number.isNaN(lastLon) ? degPerPx : Math.max(1e-6, Math.hypot(dLon * Math.cos(lat * RAD), lat - lastLat))
        lastLon = lon
        lastLat = lat
        const lonWidth = Math.min(local / Math.max(0.02, Math.cos(lat * RAD)), step / 2)
        if (near(lat) < local * 0.6 || near(lon) < lonWidth * 0.6) {
          grat[i] = 1
          tones[i] = tone > 128 ? tone - 70 : tone + 70
        }
      }
    }
  }

  // Where each country is on screen, then which are shown.
  let picked: Set<number> | null = null
  if (config.composition === 'countries') {
    const where = new Map<string, { count: number, x: number, y: number }>()
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const id = ids[y * width + x]!
        if (id <= 0) continue
        const name = data.names[id - 1]!
        const at = where.get(name) ?? { count: 0, x: 0, y: 0 }
        at.count += 4
        at.x += x * 4
        at.y += y * 4
        where.set(name, at)
      }
    }
    picked = pickCountries(data, config, where, title, width, height)
  }
  const ink = config.ink === 'light' ? 236 : 30
  // Tone 'lines' in light ink: on a dark panel (as nullschool's), the dark ink on
  // the page itself.
  const paper = config.tone === 'lines' && config.ink === 'light' ? 46 : -1

  // Second pass: lines, and what shows.
  const inside = (x: number, y: number) => !shown || shown.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const id = ids[i]!
      if (id < 0) {
        if (paper >= 0 && inside(x, y)) {
          px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = paper
          px[i * 4 + 3] = 255
        }
        continue
      }
      const right = x + 1 < width ? ids[i + 1]! : id
      const down = y + 1 < height ? ids[i + width]! : id
      const coastHere = config.coast && ((id > 0) !== (right > 0) || (id > 0) !== (down > 0)) && right >= 0 && down >= 0
      const borderHere = (id > 0 && right > 0 && right !== id) || (id > 0 && down > 0 && down !== id)
      let tone = tones[i]!
      let alpha = 255
      if (config.tone === 'lines') {
        // Only lines: the coast full, borders dotted, the graticule faint; of
        // the picked countries only, if some are, the others' fainter still.
        const edge = (id > 0) !== (right > 0) || (id > 0) !== (down > 0)
        const mine = !picked || picked.has(id) || picked.has(right) || picked.has(down)
        tone = ink
        alpha = 0
        if (grat[i]) alpha = 80
        if (borderHere && config.borders && (x + y) % 3 !== 0) alpha = mine ? 150 : (config.others === 'hidden' ? alpha : 60)
        if (edge && right >= 0 && down >= 0) alpha = mine ? 255 : (config.others === 'hidden' ? alpha : 90)
        if (paper >= 0) {
          tone = paper + (ink - paper) * alpha / 255
          alpha = 255
        }
        if (!inside(x, y)) alpha = 0
      }
      else if (picked) {
        const mine = picked.has(id)
        const outline = coastHere || borderHere || (id > 0 && ((right > 0 && right !== id && (picked.has(right) || mine)) || (down > 0 && down !== id && (picked.has(down) || mine))))
        if (!mine) {
          if (config.others === 'faint' && id > 0) alpha = 60
          else if (config.others === 'outline' && id > 0 && (borderHere || ((id > 0) !== (right > 0) || (id > 0) !== (down > 0))) && (x + y) % 3 !== 0) {
            tone = 150
            alpha = 200
          }
          else alpha = 0
        }
        else if (outline && config.borders) tone = tone > 128 ? tone - 90 : tone + 90
      }
      else {
        if (borderHere && config.borders && (x + y) % 3 !== 0) tone = tone > 128 ? tone - 80 : tone + 80
        if (coastHere) tone = tone > 128 ? tone - 60 : tone + 60
        if (!inside(x, y)) alpha = 0
      }
      const o = i * 4
      px[o] = px[o + 1] = px[o + 2] = tone
      px[o + 3] = alpha
    }
  }
  return out
}
