// Builds app/data/cardCountries.json (CardCountry.vue): recognisable countries
// as fine dot grids, sampled from the map lab's country index
// (public/map-lab/*-ids.png) in a headless Chrome, against the dev server.
// Run: npm run dev, then node scripts/card-countries.mjs app/data/cardCountries.json
// (needs playwright-core: npx -y -p playwright-core@1.56.1 node … or a local install).
// It rewrites the whole file: run scripts/card-splash-shapes.mjs after it.
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'
const out = process.argv[2]
// name, window [west, south, east, north] (keeps overseas parts out)
const LIST = [
  ['France', [-5.5, 41, 10, 51.5]], ['Italy', [6, 36, 19, 47.5]], ['Spain', [-10, 35.5, 4.5, 44]], ['United Kingdom', [-8.5, 49.5, 2, 61]],
  ['Norway', [4, 57.5, 31.5, 71.5]], ['Sweden', [10.5, 55, 24.5, 69.5]], ['Germany', [5.5, 47, 15.5, 55.5]], ['Poland', [14, 49, 24.5, 55]],
  ['Ukraine', [22, 44, 40.5, 52.5]], ['Greece', [19.5, 34.5, 28.5, 42]], ['Turkey', [25.5, 35.5, 45, 42.5]], ['Egypt', [24.5, 21.5, 37, 32]],
  ['India', [68, 6, 97.5, 36]], ['Japan', [129, 30.5, 146, 46]], ['Australia', [112.5, -39.5, 154, -10.5]], ['Brazil', [-74, -34, -34.5, 5.5]],
  ['Mexico', [-118, 14.5, -86.5, 33]], ['Argentina', [-73.5, -55.5, -53.5, -21.5]], ['Madagascar', [43, -26, 51, -11.5]], ['Iceland', [-24.5, 63, -13, 66.6]],
  ['Ireland', [-10.5, 51.4, -6, 55.5]], ['Portugal', [-9.6, 36.9, -6.1, 42.2]], ['Finland', [20.5, 59.7, 31.6, 70.1]], ['South Africa', [16.4, -35, 33, -22]],
  ['Morocco', [-13.3, 27.6, -1, 36]], ['Romania', [20.2, 43.6, 29.8, 48.3]], ['Croatia', [13.4, 42.3, 19.5, 46.6]],
]
const CELLS = 36 // across the longer side
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
await page.goto('http://localhost:3000/map-lab/eq-meta.json')
const result = await page.evaluate(async ({ LIST, CELLS }) => {
  const meta = await (await fetch('/map-lab/eq-meta.json')).json()
  const tiles = await Promise.all(meta.tiles.map(async (t) => {
    const bmp = await createImageBitmap(await (await fetch(`/map-lab/${t.file}-ids.png`)).blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
    const c = new OffscreenCanvas(bmp.width, bmp.height); const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bmp, 0, 0)
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data
    const ids = new Uint8Array(bmp.width * bmp.height); for (let i = 0; i < ids.length; i++) ids[i] = d[i * 4]
    return { ...t, ids, width: bmp.width, height: bmp.height }
  }))
  const idAt = (lon, lat) => {
    for (const t of tiles) {
      const u = Math.round((lon - t.west) * t.ppd); const v = Math.round((t.north - lat) * t.ppd)
      if (u >= 0 && v >= 0 && u < t.width && v < t.height) return t.ids[v * t.width + u]
    }
    return 0
  }
  const out = {}
  for (const [name, [w, s, e, n]] of LIST) {
    const id = meta.names.indexOf(name) + 1
    if (!id) { out[name] = null; continue }
    const k = Math.cos(((s + n) / 2) * Math.PI / 180)
    const step = Math.max((e - w) * k, n - s) / CELLS // degrees of latitude per cell
    const cols = Math.ceil(((e - w) * k) / step); const rows = Math.ceil((n - s) / step)
    const cells = []
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lon = w + ((c + 0.5) * step) / k; const lat = n - (r + 0.5) * step
      if (idAt(lon, lat) === id) cells.push([c, r])
    }
    // trimmed to the cells
    const minC = Math.min(...cells.map((p) => p[0])); const minR = Math.min(...cells.map((p) => p[1]))
    const maxC = Math.max(...cells.map((p) => p[0])); const maxR = Math.max(...cells.map((p) => p[1]))
    out[name] = { cols: maxC - minC + 1, rows: maxR - minR + 1, cells: cells.map(([c, r]) => [c - minC, r - minR]) }
  }
  return out
}, { LIST, CELLS })
for (const [k, v] of Object.entries(result)) console.log(k.padEnd(16), v ? `${v.cols}x${v.rows} ${v.cells.length} cells` : 'MISSING')
writeFileSync(out, JSON.stringify(result))
await browser.close()
