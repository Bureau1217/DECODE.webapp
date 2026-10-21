<script setup lang="ts">
// The home screen's right half once the splash is gone — the splash's own
// vocabulary at rest (grid, pixel-dot countries, display headline on white
// boxes) instead of an empty pane. No image band and no instructions:
// the headline says who this is for, the subtitle who made it.
const language = useLanguage()

// Both editable in the CMS (Informations générales — site_infos.yml's
// home_headline/home_subtitle, translatable); the copy below only fills
// in while that's empty or unreachable.
const { data: cms } = useAsyncData('home-hero', () =>
  useKql<{ home_headline?: { line?: string }[], home_subtitle?: string } | null>({
    query: "site.children.filterBy('intendedTemplate', 'site_infos').first",
    select: { home_headline: 'page.content.home_headline.toStructure', home_subtitle: true },
  }), { watch: [language] })

const FALLBACK = {
  en: {
    headline: ['Learn to check', 'what you see', 'online'],
    subtitle: 'Made with journalists and researchers, free and open for every classroom.',
  },
  fr: {
    headline: ['Apprendre à vérifier', 'ce que l’on voit', 'en ligne'],
    subtitle: 'Conçu avec des journalistes et des chercheur·euses, libre et ouvert à toutes les classes.',
  },
} as const
const copy = computed(() => {
  const fallback = FALLBACK[language.value] ?? FALLBACK.en
  const headline = (cms.value?.home_headline ?? []).map((row) => row.line?.trim() ?? '').filter(Boolean)
  const subtitle = (cms.value?.home_subtitle ?? '').replace(/<[^>]+>/g, '').trim()
  return { headline: headline.length ? headline : fallback.headline, subtitle: subtitle || fallback.subtitle }
})

// Whole cells only, like the splash's computeGrid: each axis divided into
// a whole number of ~72px cells, so no clipped partial cell at the edges.
const SQUARE_TARGET = 72
const gridEl = ref<HTMLElement | null>(null)
const grid = ref<{ w: number, h: number, cols: number, rows: number, cellW: number, cellH: number } | null>(null)
function computeCells() {
  if (!gridEl.value) return
  const { width: w, height: h } = gridEl.value.getBoundingClientRect()
  const cols = Math.max(1, Math.round(w / SQUARE_TARGET))
  const rows = Math.max(1, Math.round(h / SQUARE_TARGET))
  grid.value = { w, h, cols, rows, cellW: w / cols, cellH: h / rows }
}
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  computeCells()
  resizeObserver = new ResizeObserver(computeCells)
  if (gridEl.value) resizeObserver.observe(gridEl.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

// Same pixel-dot shapes as the splash (public/splash), each one snapped
// to the grid: its top-left on a cell corner, its width a whole number of
// cells. Anchors are counted from the grid's own edges (negative = from
// the right/bottom), so the layout holds whatever the cell count — big
// shapes hugging the four corners, two smaller ones on the top and
// bottom edges, the middle left to the headline.
const COUNTRIES = [
  { src: '/splash/ca.svg', col: 0, row: 0, span: 4 },
  { src: '/splash/ml.svg', col: -6, row: 1, span: 2 },
  { src: '/splash/group-43.svg', col: -3, row: 0, span: 3 },
  { src: '/splash/br.svg', col: 0, row: -4, span: 3 },
  { src: '/splash/pe.svg', col: 4, row: -2, span: 1 },
  { src: '/splash/group-42.svg', col: -4, row: -4, span: 4 },
]
// Each shape drifts on its own, like a continent floating loose on the
// grid: three independent ease-in-out swings (sideways, up/down, a slight
// tilt), each with its own period, so their sum never visibly repeats
// and no two shapes move in step. Amplitudes are in cells (a shape never
// strays more than about a cell from its snapped spot); negative delays
// start every swing mid-way, so nothing begins from a standstill.
const DRIFTS = [
  { x: 0.9, y: 0.5, r: 3, tx: 23, ty: 17, tr: 31 },
  { x: -0.6, y: 0.8, r: -4, tx: 19, ty: 26, tr: 23 },
  { x: 0.7, y: -0.6, r: 2, tx: 29, ty: 21, tr: 37 },
  { x: -0.8, y: -0.5, r: -3, tx: 25, ty: 15, tr: 29 },
  { x: 0.5, y: 0.9, r: 5, tx: 17, ty: 23, tr: 19 },
  { x: -1, y: 0.6, r: -2, tx: 31, ty: 19, tr: 41 },
]
function driftStyle(index: number) {
  const d = DRIFTS[index % DRIFTS.length]!
  const g = grid.value
  return {
    '--drift-x': `${d.x * (g?.cellW ?? 72)}px`,
    '--drift-y': `${d.y * (g?.cellH ?? 72)}px`,
    '--drift-r': `${d.r}deg`,
    '--drift-tx': `${d.tx}s`,
    '--drift-ty': `${d.ty}s`,
    '--drift-tr': `${d.tr}s`,
    '--drift-phase': `${-(index * 7.3) % 13}s`,
  }
}

function countryStyle(country: (typeof COUNTRIES)[number]) {
  const g = grid.value
  if (!g) return { display: 'none' }
  const col = country.col < 0 ? g.cols + country.col : country.col
  const row = country.row < 0 ? g.rows + country.row : country.row
  return {
    left: `${col * g.cellW}px`,
    top: `${row * g.cellH}px`,
    width: `${country.span * g.cellW}px`,
  }
}

// Arrival, like the splash building itself: every grid line grows out
// of its own centre (staggered from the middle outwards), then the
// country shapes open up, then the headline's boxes open and its words
// decipher in, then the subtitle.
const verticals = computed(() => (grid.value ? Array.from({ length: grid.value.cols + 1 }, (_, k) => k * grid.value!.cellW) : []))
const horizontals = computed(() => (grid.value ? Array.from({ length: grid.value.rows + 1 }, (_, k) => k * grid.value!.cellH) : []))
function lineDelay(k: number, count: number) {
  return `${Math.abs(k - count / 2) * 0.04}s`
}
const HEADLINE_MS = 900
</script>

<template>
  <main class="home-hero">
    <div ref="gridEl" class="home-hero-grid" aria-hidden="true">
      <svg v-if="grid" class="home-hero-lines" :width="grid.w + 1" :height="grid.h + 1">
        <line
          v-for="(x, k) in verticals"
          :key="`v${k}`"
          :x1="x + 0.5"
          :x2="x + 0.5"
          y1="0"
          :y2="grid.h + 1"
          :style="{ animationDelay: lineDelay(k, grid.cols) }"
        />
        <line
          v-for="(y, k) in horizontals"
          :key="`h${k}`"
          x1="0"
          :x2="grid.w + 1"
          :y1="y + 0.5"
          :y2="y + 0.5"
          :style="{ animationDelay: lineDelay(k, grid.rows) }"
        />
      </svg>
      <!-- Placed on the grid (countryStyle), then each nested layer
           drifts one axis on its own clock (driftStyle). -->
      <div
        v-for="(country, index) in COUNTRIES"
        :key="country.src"
        class="home-hero-country"
        :style="{ ...countryStyle(country), ...driftStyle(index) }"
      >
        <div class="home-hero-drift-y">
          <img
            :src="country.src"
            class="home-hero-drift-r no-duotone"
            :style="{ animationDelay: `${0.5 + index * 0.08}s, var(--drift-phase)` }"
            alt=""
          >
        </div>
      </div>
    </div>

    <div class="home-hero-text">
      <h1 class="home-hero-headline">
        <span v-for="(line, index) in copy.headline" :key="line" class="home-hero-line">
          <span class="home-hero-line-box" :style="{ animationDelay: `${0.7 + index * 0.1}s` }">
            <DecipherText :text="line" grow :delay="HEADLINE_MS + index * 100" />
          </span>
        </span>
      </h1>
      <p class="text-h3 home-hero-subtitle">
        <span class="home-hero-subtitle-box">
          <DecipherText :text="copy.subtitle" :delay="HEADLINE_MS + 500" />
        </span>
      </p>
    </div>
  </main>
</template>

<style scoped>
/* Exactly the space between the fixed nav/index bar and the footer,
   like the guide grid (guide/index.vue). */
.home-hero {
  position: relative;
  height: calc(100vh - 8.5vh - var(--footer-height));
  overflow: hidden;
}

/* The splash grid, inset by the same margin on all four sides; drawn as
   separate lines (below) so each can grow in on its own. */
.home-hero-grid {
  position: absolute;
  inset: 6%;
}

.home-hero-lines {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.home-hero-lines line {
  stroke: var(--color-ink);
  stroke-width: 1;
  shape-rendering: crispEdges;
  transform-box: fill-box;
  transform-origin: center;
  animation: home-hero-line-grow 0.9s cubic-bezier(0.2, 0.6, 0.3, 1) both;
}

@keyframes home-hero-line-grow {
  from {
    transform: scale(0);
  }
}

/* Drift (script, driftStyle): sideways on this element, up/down on
   the next, tilt on the image itself — three periods that never line
   up. The image's first animation is its entrance (home-hero-open). */
.home-hero-country {
  position: absolute;
  pointer-events: none;
  animation: home-hero-drift-x var(--drift-tx) ease-in-out var(--drift-phase) infinite alternate;
}

.home-hero-drift-y {
  animation: home-hero-drift-y var(--drift-ty) ease-in-out var(--drift-phase) infinite alternate;
}

.home-hero-drift-r {
  display: block;
  width: 100%;
  height: auto;
  animation:
    home-hero-open 0.8s cubic-bezier(0.2, 0.6, 0.3, 1) both,
    home-hero-drift-r var(--drift-tr) ease-in-out infinite alternate;
}

@keyframes home-hero-drift-x {
  from {
    transform: translateX(calc(var(--drift-x) * -0.5));
  }

  to {
    transform: translateX(calc(var(--drift-x) * 0.5));
  }
}

@keyframes home-hero-drift-y {
  from {
    transform: translateY(calc(var(--drift-y) * -0.5));
  }

  to {
    transform: translateY(calc(var(--drift-y) * 0.5));
  }
}

@keyframes home-hero-drift-r {
  from {
    rotate: calc(var(--drift-r) * -1);
  }

  to {
    rotate: var(--drift-r);
  }
}

/* Opens out of its own horizontal centre line — the splash images'
   own reveal. */
@keyframes home-hero-open {
  from {
    clip-path: inset(50% 0 50% 0);
  }

  to {
    clip-path: inset(0 0 0 0);
  }
}

.home-hero-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 8%;
  text-align: center;
  pointer-events: none;
}

/* Splash headline face, scaled to the half-width pane, in the brand
   brown. */
.home-hero-headline {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(28px, 3.3vw, 72px);
  line-height: 1;
  text-transform: uppercase;
  color: var(--color-brand);
}

.home-hero-line {
  display: block;
  white-space: nowrap;
}

/* White backing per line, hugging the text — the grid shows between
   and around the lines, as on the splash. Opens sideways from its
   centre before its words decipher in. */
.home-hero-line-box {
  display: inline-block;
  padding: 0.04em 0.12em;
  background: var(--color-surface);
  animation: home-hero-box-open 0.6s cubic-bezier(0.2, 0.6, 0.3, 1) both;
}

@keyframes home-hero-box-open {
  from {
    clip-path: inset(0 50% 0 50%);
  }

  to {
    clip-path: inset(0 0 0 0);
  }
}

.home-hero-subtitle {
  margin: 0;
}

/* Same box and line balancing as the splash subtitle, filled brown. */
.home-hero-subtitle-box {
  display: inline-block;
  max-width: 40ch;
  padding: 12px;
  background: var(--color-brand);
  color: var(--color-on-fill);
  line-height: 1.15;
  text-wrap: balance;
  animation: home-hero-box-open 0.6s cubic-bezier(0.2, 0.6, 0.3, 1) 1.3s both;
}

@media (prefers-reduced-motion: reduce) {
  .home-hero-lines line,
  .home-hero-country,
  .home-hero-drift-y,
  .home-hero-drift-r,
  .home-hero-line-box,
  .home-hero-subtitle-box {
    animation: none;
  }
}

@media (max-width: 768px) {
  .home-hero {
    display: none;
  }
}
</style>
