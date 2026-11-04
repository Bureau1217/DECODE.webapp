// The pixel masses behind the splash headline (Splash.vue): grids of cells, so one
// can turn into another a cell at a time.
export const SHAPE_COLS = 29
export type ShapeMass = boolean[][]

export function mulberry32(seed: number) {
  let state = seed | 0
  return function random() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cellNoise = (seed: number, x: number, y: number) => mulberry32(seed ^ Math.imul(x + 1009, 73856093) ^ Math.imul(y + 2003, 19349663))()

// Noise that drifts smoothly over `size` cells, rather than changing per cell.
function smoothNoise(seed: number, x: number, y: number, size: number) {
  const fx = x / size
  const fy = y / size
  const ix = Math.floor(fx)
  const iy = Math.floor(fy)
  const u = fx - ix
  const v = fy - iy
  const sx = u * u * (3 - 2 * u)
  const sy = v * v * (3 - 2 * v)
  const a = cellNoise(seed, ix, iy)
  const b = cellNoise(seed, ix + 1, iy)
  const c = cellNoise(seed, ix, iy + 1)
  const d = cellNoise(seed, ix + 1, iy + 1)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

// The drawn silhouette, on its own 14.58-unit grid (29 × 39).
export const SHAPE_DRAWN: ShapeMass = [
  '.............##..............',
  '...........##................',
  '..........##.................',
  '........##...................',
  '.......##....................',
  '......##.....................',
  '.....###.....................',
  '.....####....................',
  '....#####...##...............',
  '...####..######..............',
  '...####..####..#.#...........',
  '..###.....#....###...........',
  '..###.........#..##..........',
  '.####...........##...........',
  '.#####..###.....###..........',
  '.#####..###....###...........',
  '#######.###...####...........',
  '############.#####...........',
  '########.##########..........',
  '#########.##############.....',
  '##########.###############...',
  '###########.###########.##...',
  '####.#####################...',
  '############################.',
  '###########################..',
  '####.####################....',
  '###...#########..#..####.....',
  '.##...##.#######....###......',
  '.###...##########............',
  '.####..###########...........',
  '..####..#########............',
  '..###.#....####..............',
  '...####......................',
  '...######....................',
  '....###..##..................',
  '.....##..##..................',
  '.....##...#..................',
  '......##..#..................',
  '.............................',
].map((row) => [...row].map((cell) => cell === '#'))

// A landmass: noise at three scales, stronger towards the middle of the grid,
// settled once so it steps rather than frays, then a few holes and loose squares.
export function generateMass(seed: number, cols: number, rows: number, phase = 0): ShapeMass {
  // The noise's grain follows the mass's size, so a small one isn't just a blob.
  const grain = Math.min(1, Math.max(0.5, Math.min(cols, rows) / SHAPE_COLS))
  const cells: ShapeMass = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
    const edge = Math.hypot(((x + 0.5) / cols * 2 - 1) * 1.05, ((y + 0.5) / rows * 2 - 1) * 0.95)
    // `phase` slides the noise along: a little of it changes the mass only a little.
    const noise = smoothNoise(seed, x + phase, y, 10 * grain) * 0.46 + smoothNoise(seed + 1, x, y - phase, 5 * grain) * 0.36 + smoothNoise(seed + 3, x - phase, y + phase, 2.5 * grain) * 0.18
    return noise + (0.6 - edge) * 0.5 > 0.5
  }))
  const neighbors = (grid: ShapeMass, x: number, y: number) => {
    let count = 0
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        if ((i || j) && grid[y + j]?.[x + i]) count++
      }
    }
    return count
  }
  const settled = cells.map((row, y) => row.map((on, x) => {
    const count = neighbors(cells, x, y)
    return count >= 5 || (on && count >= 3)
  }))
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const count = neighbors(settled, x, y)
      const chance = cellNoise(seed + 2, x, y)
      const nearby = [-3, 3].some((j) => [-3, 3].some((i) => settled[y + j]?.[x + i]))
      if (count === 8 && chance < 0.03) settled[y]![x] = false
      else if (count === 0 && chance < 0.09 && nearby) settled[y]![x] = true
    }
  }
  return settled
}

// A mass stretched to another size, a cell at a time.
export function resizeMass(mass: ShapeMass, cols: number, rows: number): ShapeMass {
  return Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
    mass[Math.floor(y / rows * mass.length)]![Math.floor(x / cols * mass[0]!.length)]!))
}

// Cells on the shared grid behind the splash, all one size, keyed by position.
const cellKey = (x: number, y: number) => y * 4096 + x
export function stampMass(mass: ShapeMass, left: number, top: number, cols: number, rows: number, firstRow: number) {
  const cells = new Set<number>()
  mass.forEach((row, j) => row.forEach((on, i) => {
    const x = left + i
    const y = top + j
    if (on && x >= 0 && x < cols && y >= firstRow && y < rows) cells.add(cellKey(x, y))
  }))
  return cells
}

// One fill, and one outline around the mass and its holes (not a line per cell).
export function cellPaths(cells: Set<number>) {
  let fill = ''
  let outline = ''
  for (const key of cells) {
    const x = key % 4096
    const y = Math.floor(key / 4096)
    fill += `M${x} ${y}h1v1h-1z`
    if (!cells.has(cellKey(x, y - 1))) outline += `M${x} ${y}h1`
    if (!cells.has(cellKey(x + 1, y))) outline += `M${x + 1} ${y}v1`
    if (!cells.has(cellKey(x, y + 1))) outline += `M${x} ${y + 1}h1`
    if (!cells.has(cellKey(x - 1, y))) outline += `M${x} ${y}v1`
  }
  return { fill, outline }
}

// What has to change to turn one set of cells into another, and when (0 to 1):
// in the direction the mass is heading, so its back falls away first and its
// front grows last and it flows across the grid, with noise so the front breaks up.
export function morphSteps(from: Set<number>, to: Set<number>, directionX: number, directionY: number, seed: number) {
  const steps: { key: number, add: boolean, x: number, y: number, along: number }[] = []
  const norm = Math.hypot(directionX, directionY) || 1
  const add = (key: number, adding: boolean) => {
    const x = key % 4096
    const y = Math.floor(key / 4096)
    steps.push({ key, add: adding, x, y, along: (x * directionX + y * directionY) / norm })
  }
  for (const key of from) if (!to.has(key)) add(key, false)
  for (const key of to) if (!from.has(key)) add(key, true)
  const alongs = steps.map((step) => step.along)
  const min = Math.min(...alongs)
  const range = Math.max(1, Math.max(...alongs) - min)
  return steps
    .map((step) => ({
      key: step.key,
      add: step.add,
      time: (step.along - min) / range * 0.7 + smoothNoise(seed, step.x, step.y, 6) * 0.2 + cellNoise(seed + 1, step.x, step.y) * 0.1,
    }))
    .sort((a, b) => a.time - b.time)
}
