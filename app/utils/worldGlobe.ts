// basics,world's globe (SplashWorldGlobe.vue): its settings, set by hand in
// its editor (/?splash=basics,world&edit), whose "Copier le code" gives this
// object back to paste over WORLD_DEFAULTS.

export type WorldLook = 'dots' | 'rings' | 'halftone' | 'outline' | 'hatch'
export const WORLD_LOOKS: WorldLook[] = ['dots', 'rings', 'halftone', 'outline', 'hatch']
export const WORLD_LOOK_NAMES: Record<WorldLook, string> = { dots: 'points', rings: 'cercles', halftone: 'trame', outline: 'contour', hatch: 'hachures' }

/**
 * orthographic: the globe seen from far off (no perspective);
 * perspective: seen from `distance` radii, the near side swelling;
 * flat: unrolled into a map (equirectangular), scrolling as it turns;
 * stereographic: as earth.nullschool.net's (22 Nov 2026): past the horizon
 *   (by `reach`), shapes kept true and swelling towards the edge;
 * disc: the SVG as drawn, flat, turning on itself (roll).
 */
export type WorldProjection = 'orthographic' | 'perspective' | 'stereographic' | 'flat' | 'disc' | MapProjection
/**
 * The map lab's projections (utils/silverMap.ts, pages/lab/map.vue), for the
 * pixel world drawn from the map lab's real world (SplashWorldGlobe, drawMap):
 * the only ones the editor offers (22 Nov 2026). The ones above stay for
 * settings saved before.
 */
export type MapProjection = 'laea' | 'orthographic' | 'stereographic' | 'equidistant' | 'gnomonic' | 'mercator' | 'equirect'
export const MAP_PROJECTIONS: MapProjection[] = ['laea', 'orthographic', 'stereographic', 'equidistant', 'gnomonic', 'mercator', 'equirect']
export const MAP_PROJECTION_NAMES: Record<MapProjection, string> = { laea: 'Lambert (UE)', orthographic: 'globe', stereographic: 'stéréographique', equidistant: 'équidistante', gnomonic: 'gnomonique', mercator: 'Mercator', equirect: 'équirectangulaire' }
export const isMapProjection = (p: WorldProjection): p is MapProjection => (MAP_PROJECTIONS as string[]).includes(p)
/** full: everything; countries: some countries (fragments); cells: some of
 *  the grid's cells; split: the sea's cells left of a line, the land's right. */
export type MapComposition = 'full' | 'countries' | 'cells' | 'split'
export const MAP_COMPOSITION_NAMES: Record<MapComposition, string> = { full: 'tout', countries: 'fragments (pays)', cells: 'cellules', split: 'partage' }
export type MapOthers = 'hidden' | 'outline' | 'faint'
export const MAP_OTHERS_NAMES: Record<MapOthers, string> = { hidden: 'masqués', outline: 'contour', faint: 'pâles' }
export const WORLD_PROJECTIONS: WorldProjection[] = ['orthographic', 'perspective', 'stereographic', 'flat', 'disc']
export const WORLD_PROJECTION_NAMES: Record<'orthographic' | 'perspective' | 'stereographic' | 'flat' | 'disc', string> = { orthographic: 'globe', perspective: 'perspective', stereographic: 'stéréographique', flat: 'carte à plat', disc: 'disque' }

export interface WorldSettings {
  projection: WorldProjection
  /** perspective: the eye's distance from the centre, in radii. */
  distance: number
  /** stereographic: how far past the horizon it shows (°). */
  reach: number
  /** The globe's diameter, of the grid's height (the map's height, flat). */
  size: number
  /** Squashed top to bottom (its poles brought in): 1 round, under 1 flatter. */
  squash: number
  /** Its centre off the screen's, in % of the grid's width / height. */
  x: number
  y: number
  /** Seconds for one turn (0: still); negative turns the other way. */
  turn: number
  /** 3D: the sphere turns. Off: the projection held still (at `lon`), the
   *  picture turning flat on itself instead. */
  rotate3d: boolean
  /** The longitude facing the viewer (°): which side of the world shows. */
  lon: number
  /** The axis leant towards the viewer (°). */
  tilt: number
  /** The whole turned in the screen's plane (°). */
  roll: number
  /** The share of shapes shown at once (0 to 1). */
  shown: number
  /** A shape's coming and going, its shortest and longest cycle (s). */
  cycleMin: number
  cycleMax: number
  /** The dots' size, times. */
  dot: number
  /** The strokes' width, times. */
  stroke: number
  /** The front's opacity, the far side's. */
  alpha: number
  back: number
  /** How much fainter and smaller towards the rim (0: not at all). */
  rim: number
  /** Between each shape's two colours: 0 one colour, 1 the full blend. */
  blend: number
  /** A mirrored copy on the far side (else that side is empty). */
  mirror: boolean
  looks: WorldLook[]
  /** Indices into the splash's country colours. */
  colors: number[]
  /** Another draw of the looks, colours and cycles. */
  seed: number
  // ---- The map lab's (map projections only) ----
  /** The centre's latitude (°); its longitude is `lon`, turning by `turn`. */
  lat: number
  /** The map lab's zoom: px per radian, of the grid's shorter side. */
  zoom: number
  /** A cell's step on the screen (px). */
  cell: number
  /** filled: every cell of the land; lines: only its edges (coasts, borders). */
  fill: 'filled' | 'lines'
  composition: MapComposition
  /** countries: these (names, as the map lab's), or else `count` at random. */
  countries: string[]
  count: number
  others: MapOthers
  /** cells: of the grid's cells, how many show it. */
  cellShare: number
  /** split: where the line is, of the width. */
  split: number
  /** 0 to 1: cells kept as the land is dark (NASA's Blue Marble), a stipple. */
  grain: number
  borders: boolean
  coast: boolean
  /** The latitude and longitude lines, every so many degrees (0: none). */
  graticule: number
  /** Drawn inside the grid only, or over the whole splash. */
  inGrid: boolean
  /** The shapes' coming and going, how fast: 1 as set by the cycles, 0 still. */
  pace: number
  /** All the shapes coming and going together (one cycle), not each its own. */
  sync: boolean
  /** fill 'lines': now and then filled, cell by cell, then back to lines. */
  fillPulse: boolean
  /** ...about every so many seconds (each time a little earlier or later)... */
  fillEvery: number
  /** ...for so many seconds. */
  fillHold: number
  /** Dark mode: these colours instead of `colors` (empty: the same). */
  darkColors: number[]
  /** Seconds it takes to fade in, once the splash shows it. */
  appear: number
}

// The editor's "Copier le code", 22 Nov 2026 (stereographic, from far off,
// turning slowly, low in the grid): the preset "Ma version".
export const WORLD_VERSION_1: WorldSettings = {
  projection: 'stereographic',
  distance: 3,
  reach: 70,
  size: 1.4,
  squash: 1,
  x: 0,
  y: 19,
  turn: 213,
  rotate3d: true,
  lon: 0,
  tilt: 22,
  roll: 0,
  shown: 0.6,
  cycleMin: 16,
  cycleMax: 34,
  dot: 1,
  stroke: 1,
  alpha: 0.85,
  back: 0.18,
  rim: 0,
  blend: 1,
  mirror: true,
  looks: ['dots', 'rings', 'halftone', 'outline', 'hatch'],
  colors: [0, 1, 2, 3, 4, 5],
  seed: 4271,
  lat: 22,
  zoom: 0.15,
  cell: 10,
  fill: 'filled',
  composition: 'full',
  countries: [],
  count: 7,
  others: 'outline',
  cellShare: 0.4,
  split: 0.5,
  grain: 0,
  borders: true,
  coast: false,
  graticule: 0,
  inGrid: false,
  pace: 1,
  sync: false,
  fillPulse: false,
  fillEvery: 90,
  fillHold: 8,
  darkColors: [],
  appear: 10,
}

// The editor's "Copier le code", 22 Nov 2026, the second: nullschool's
// stereographic, close, in the grid, coasts and the latitude and longitude
// lines, dots, rings and halftone only. The preset "Ma version 2".
export const WORLD_VERSION_2: WorldSettings = {
  ...WORLD_VERSION_1,
  y: 0,
  turn: 300,
  lon: 20,
  looks: ['dots', 'rings', 'halftone'],
  lat: 43,
  zoom: 1.35,
  borders: false,
  coast: true,
  graticule: 10,
  inGrid: true,
}

// The third, 22 Nov 2026 (read off the editor): the World preset's view
// (stereographic, far off, lines only, every 15°), in the grid, dots, rings
// and halftone, coming and going slowly. The preset "Ma version 3".
export const WORLD_VERSION_3: WorldSettings = {
  ...WORLD_VERSION_1,
  y: 0,
  turn: 80,
  lon: 20,
  looks: ['dots', 'rings', 'halftone'],
  lat: 10,
  zoom: 0.2,
  fill: 'lines',
  borders: false,
  coast: false,
  graticule: 15,
  inGrid: true,
  pace: 0.4,
  // Now and then filled; in dark mode, the badges' red and blue.
  fillPulse: true,
  fillEvery: 90,
  fillHold: 8,
  darkColors: [6, 7],
}

// The fourth, 22 Nov 2026 (read off the editor): the third, filled more
// often (about every 40 s, for 6 s), in dark mode in the red alone.
export const WORLD_VERSION_4: WorldSettings = {
  ...WORLD_VERSION_3,
  fillEvery: 40,
  fillHold: 6,
  darkColors: [7],
}

// The splash's own (/, 22 Nov 2026): the fourth, a flash of its filling
// every 30 s or so, for a second. Also the preset "Splash".
export const WORLD_DEFAULTS: WorldSettings = {
  ...WORLD_VERSION_4,
  fillEvery: 30,
  fillHold: 1,
  // A turn every 160 s (80 until 22 Nov 2026: slowed).
  turn: 160,
}

/** The map lab's presets (SILVER_MAP_PRESETS), on these settings. */
export const MAP_PRESETS: Record<string, Partial<WorldSettings>> = {
  'Splash': structuredClone(WORLD_DEFAULTS),
  'Ma version': structuredClone(WORLD_VERSION_1),
  'Ma version 2': structuredClone(WORLD_VERSION_2),
  'Ma version 3': structuredClone(WORLD_VERSION_3),
  'Ma version 4': structuredClone(WORLD_VERSION_4),
  'Whole (LAEA)': { projection: 'laea', lon: 12, lat: 51, zoom: 4, turn: 0 },
  'Fragments': { projection: 'laea', lon: 12, lat: 51, zoom: 4, turn: 0, composition: 'countries', count: 7, others: 'outline', borders: false, coast: false },
  'Cells': { projection: 'laea', lon: 12, lat: 51, zoom: 4, turn: 0, composition: 'cells', cellShare: 0.35 },
  'Split': { projection: 'laea', lon: 12, lat: 51, zoom: 4, turn: 0, composition: 'split', split: 0.42 },
  'Globe': { projection: 'orthographic', lon: 14, lat: 46, zoom: 0.95, graticule: 10, coast: true, borders: false },
  'Nullschool': { projection: 'stereographic', lon: 20, lat: 43, zoom: 1.35, graticule: 10, borders: false, coast: true },
  'Grain': { projection: 'laea', lon: 12, lat: 51, zoom: 4, turn: 0, grain: 0.7, borders: false, coast: true },
  'Gnomonic': { projection: 'gnomonic', lon: 12, lat: 52, zoom: 2.2, turn: 0, graticule: 5, borders: true },
  'Lines': { projection: 'stereographic', lon: 15, lat: 40, zoom: 0.9, fill: 'lines', graticule: 10, borders: false },
  'World': { projection: 'stereographic', lon: 20, lat: 10, zoom: 0.2, fill: 'lines', graticule: 15, borders: false },
  'Around the title': { projection: 'laea', lon: 12, lat: 51, zoom: 4, turn: 0, composition: 'countries', count: 8, others: 'outline', borders: false },
}
/** What a preset resets first (the map's own settings, not the looks, colours or cycles). */
export const MAP_RESET: Partial<WorldSettings> = {
  x: 0, y: 0, roll: 0, turn: 80, lat: 22, zoom: 0.7, fill: 'filled', composition: 'full', countries: [], count: 7, others: 'outline', cellShare: 0.4, split: 0.5, grain: 0, borders: true, coast: false, graticule: 0,
}

/** The editor's sliders with a map projection (the map lab's, and the pixels'). */
export const MAP_FIELDS: { key: keyof WorldSettings, label: string, min: number, max: number, step: number, when?: (s: WorldSettings) => boolean }[] = [
  { key: 'lon', label: 'Centre longitude °', min: -180, max: 180, step: 0.5 },
  { key: 'lat', label: 'Centre latitude °', min: -80, max: 85, step: 0.5 },
  { key: 'zoom', label: 'Zoom', min: 0.15, max: 12, step: 0.05 },
  { key: 'roll', label: 'Rotation °', min: -180, max: 180, step: 1 },
  { key: 'turn', label: 'Tour (s, 0 : fixe)', min: -300, max: 300, step: 1 },
  { key: 'x', label: 'Gauche / droite %', min: -60, max: 60, step: 0.5 },
  { key: 'y', label: 'Haut / bas %', min: -60, max: 60, step: 0.5 },
  { key: 'cell', label: 'Cellule (px)', min: 3, max: 40, step: 1 },
  { key: 'graticule', label: 'Grille du monde ° (0 : non)', min: 0, max: 30, step: 5 },
  { key: 'count', label: 'Combien de pays', min: 1, max: 20, step: 1, when: (s) => s.composition === 'countries' && !s.countries.length },
  { key: 'cellShare', label: 'Part des cellules', min: 0.05, max: 1, step: 0.05, when: (s) => s.composition === 'cells' },
  { key: 'split', label: 'Partage à', min: 0, max: 1, step: 0.01, when: (s) => s.composition === 'split' },
  { key: 'fillEvery', label: 'Rempli tous les (s)', min: 15, max: 300, step: 1, when: (s) => s.fill === 'lines' && s.fillPulse },
  { key: 'fillHold', label: 'Rempli pendant (s)', min: 1, max: 60, step: 1, when: (s) => s.fill === 'lines' && s.fillPulse },
  { key: 'appear', label: 'Apparition (s)', min: 0, max: 30, step: 0.5 },
  { key: 'grain', label: 'Grain', min: 0, max: 1, step: 0.05 },
  { key: 'shown', label: 'Part visible', min: 0, max: 1, step: 0.01 },
  { key: 'pace', label: 'Rythme ×', min: 0, max: 4, step: 0.05 },
  { key: 'cycleMin', label: 'Cycle min (s)', min: 2, max: 120, step: 1 },
  { key: 'cycleMax', label: 'Cycle max (s)', min: 2, max: 120, step: 1 },
  { key: 'dot', label: 'Points ×', min: 0.2, max: 3, step: 0.05 },
  { key: 'stroke', label: 'Traits ×', min: 0.2, max: 4, step: 0.05 },
  { key: 'alpha', label: 'Opacité', min: 0.05, max: 1, step: 0.01 },
  { key: 'rim', label: 'Fondu au bord (globe)', min: 0, max: 1, step: 0.01 },
  { key: 'blend', label: 'Mélange couleurs', min: 0, max: 1, step: 0.01 },
  { key: 'seed', label: 'Tirage', min: 1, max: 9999, step: 1 },
]

/** The sliders' ranges, labels (French, as the editors) and steps. */
export const WORLD_FIELDS: { key: keyof WorldSettings, label: string, min: number, max: number, step: number }[] = [
  { key: 'size', label: 'Taille', min: 0.3, max: 3, step: 0.05 },
  { key: 'squash', label: 'Écraser (pôles)', min: 0.15, max: 1.6, step: 0.01 },
  { key: 'x', label: 'Gauche / droite %', min: -60, max: 60, step: 0.5 },
  { key: 'y', label: 'Haut / bas %', min: -60, max: 60, step: 0.5 },
  { key: 'distance', label: 'Distance (persp.)', min: 1.2, max: 10, step: 0.1 },
  { key: 'reach', label: 'Au-delà (stéréo) °', min: 0, max: 85, step: 1 },
  { key: 'turn', label: 'Tour (s, 0 : fixe)', min: -300, max: 300, step: 1 },
  { key: 'lon', label: 'Face vue °', min: -180, max: 180, step: 1 },
  { key: 'tilt', label: 'Inclinaison °', min: -90, max: 90, step: 1 },
  { key: 'roll', label: 'Rotation plan °', min: -180, max: 180, step: 1 },
  { key: 'shown', label: 'Part visible', min: 0, max: 1, step: 0.01 },
  { key: 'pace', label: 'Rythme ×', min: 0, max: 4, step: 0.05 },
  { key: 'cycleMin', label: 'Cycle min (s)', min: 2, max: 120, step: 1 },
  { key: 'cycleMax', label: 'Cycle max (s)', min: 2, max: 120, step: 1 },
  { key: 'dot', label: 'Points ×', min: 0.2, max: 3, step: 0.05 },
  { key: 'stroke', label: 'Traits ×', min: 0.2, max: 4, step: 0.05 },
  { key: 'alpha', label: 'Opacité', min: 0.05, max: 1, step: 0.01 },
  { key: 'back', label: 'Face cachée', min: 0, max: 1, step: 0.01 },
  { key: 'rim', label: 'Fondu au bord', min: 0, max: 1, step: 0.01 },
  { key: 'blend', label: 'Mélange couleurs', min: 0, max: 1, step: 0.01 },
  { key: 'seed', label: 'Tirage', min: 1, max: 9999, step: 1 },
]

// ---- Shared by the two globes that draw the world's cells ----
// SplashWorldGlobe.vue (basics,world: its own sphere) and SplashCartography.vue
// (basics,world,lab: the old map lab's globe, its land drawn in these cells).

/** mulberry32: the same draw for the same seed. */
export function worldRandom(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A shape's look, its two colours (indices), opacity and cycle. */
export interface WorldShape { look: WorldLook, a: number, b: number, alpha: number, period: number, phase: number, size: number }

/** Each of `count` shapes' look, colours and cycle, drawn from the settings' seed. */
export function worldShapes(s: WorldSettings, count: number, dark = false): WorldShape[] {
  const rand = worldRandom(s.seed)
  const looks = s.looks.length ? s.looks : (['dots'] as const)
  const colors = dark && s.darkColors?.length ? s.darkColors : s.colors.length ? s.colors : [0]
  const low = Math.min(s.cycleMin, s.cycleMax)
  const high = Math.max(s.cycleMin, s.cycleMax)
  return Array.from({ length: count }, (_, k) => {
    const look = looks[Math.floor(rand() * looks.length)]!
    const a = colors[Math.floor(rand() * colors.length)]!
    const b = colors[Math.floor(rand() * colors.length)]!
    const alpha = 0.8 + rand() * 0.2
    const period = low + rand() * (high - low)
    const phase = rand() * Math.PI * 2
    // sync: one cycle for all (drawn the same, so nothing else changes).
    return { look, a, b, alpha, period: s.sync ? (low + high) / 2 : period, phase: s.sync ? 0 : phase, size: [0.28, 0.4, 0.55][k % 3]! }
  })
}

/** A shape's share shown at time t (0 to 1): long rests shown or gone, the
 *  passage between them eased, so they dissolve in and out. */
export function worldShown(shape: WorldShape, t: number, share: number) {
  if (share >= 1) return 1
  if (share <= 0) return 0
  const wave = Math.sin((t / shape.period) * Math.PI * 2 + shape.phase)
  const c = Math.min(1, Math.max(0, (wave - (1 - 2 * share)) / 0.5 + 0.5))
  return c * c * (3 - 2 * c)
}

/** Colours as rgb, `var(--…)` read off `el`'s computed style. */
export function worldRgb(el: Element, colors: string[]): [number, number, number][] {
  const style = getComputedStyle(el)
  return colors.map((color) => {
    const value = color.startsWith('var(') ? style.getPropertyValue(color.slice(4, -1).trim()).trim() : color
    const hex = value.replace('#', '')
    if (/^[0-9a-f]{6}$/i.test(hex)) return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)]
    const m = value.match(/\d+(\.\d+)?/g)
    return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : [120, 120, 120]
  })
}

/** A shape's colour at a cell: between its two, by the cell's `mix`. */
export function worldColor(rgb: [number, number, number][], shape: WorldShape, mix: number, blend: number, alpha: number) {
  const a = rgb[shape.a % rgb.length] ?? [120, 120, 120]
  const b = rgb[shape.b % rgb.length] ?? a
  const m = mix * blend
  return `rgba(${Math.round(a[0] + (b[0] - a[0]) * m)},${Math.round(a[1] + (b[1] - a[1]) * m)},${Math.round(a[2] + (b[2] - a[2]) * m)},${alpha})`
}

/**
 * One cell's mark at (sx, sy), in its shape's look. `cell` is a cell's step on
 * the screen, `size` the foreshortening, `halftone` (0 to 1) the trame's
 * dot at this cell.
 */
export function drawWorldMark(ctx: CanvasRenderingContext2D, look: WorldLook, sx: number, sy: number, cell: number, size: number, s: WorldSettings, color: string, shapeSize: number, halftone: number) {
  ctx.beginPath()
  if (look === 'hatch') {
    const h = cell * 0.42 * size
    ctx.moveTo(sx - h, sy + h)
    ctx.lineTo(sx + h, sy - h)
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(0.5, cell * 0.12 * size * s.stroke)
    ctx.stroke()
  }
  else if (look === 'rings' || look === 'outline') {
    ctx.arc(sx, sy, Math.max(0.6, cell * 0.36 * size * s.dot), 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(0.5, cell * (look === 'outline' ? 0.14 : 0.09) * size * s.stroke)
    ctx.stroke()
  }
  else {
    const r = look === 'halftone' ? cell * (0.12 + 0.42 * halftone) : cell * shapeSize
    ctx.arc(sx, sy, Math.max(0.5, r * size * s.dot), 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
}
