<script setup lang="ts">
// Decorative intro screen — fails soft (empty state, no thrown error) if
// the CMS call doesn't come back, since this isn't core content.

interface BankImage {
  url: string
  alt?: string
}

interface ArticleTitle {
  title: string
}

interface SiteInfo {
  title: string
  header_subtitle?: string
  sentences?: { sentence: string }[]
  informations?: string
}

defineEmits<{ continue: [] }>()

// Shared across the numbered article badges and the per-image labels.
const BADGE_COLORS = ['#FC7C6A', '#B4EAE1', '#CDB4EA']

// Horizontal rhythm for the big display sentences (assumes CMS order
// Spotting/Deepfakes/Campaigns): first line shifted left a bit, second
// left alone, third shifted left the most — rather than all three sharing
// one center axis.
const SENTENCE_OFFSETS = [-70, 0, -90]
function sentenceOffset(index: number) {
  return `${SENTENCE_OFFSETS[index % SENTENCE_OFFSETS.length] ?? 0}px`
}

// "Reveal mask" behind the display headline — ONE blocky, orthogonal,
// irregular white silhouette spanning all three lines together (not a
// separate frame per line), like a low-res redaction layer being peeled
// back. Per reference screenshot: each line's own tight bounding box is
// always fully covered (full readability, no exceptions), and the
// irregularity comes from (a) the three lines simply being different
// widths, stacked with zero gap, so their union already has a stepped
// left/right profile, plus (b) a handful of extra rectangular
// extensions — partial-width caps along each line's own top/bottom edge,
// and end-juts past its left/right edge — that push past that box
// 10-40px in some places and stay flush in others. No piece ever sits
// over a letter. Deterministic (seeded) so the pattern doesn't reshuffle
// on every re-render — only a resize (new measured layout) changes it.
function mulberry32(seed: number) {
  let state = seed | 0
  return function random() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Plain numbers, not CSS px strings — these feed an SVG <mask> (x/y/
// width/height attributes), not inline element styles. See
// .sentence-masked / #splash-headline-mask (template, CSS) for why: the
// mask is what makes a "bite" a literal see-through hole rather than an
// opaque white patch sitting on top of the letter.
interface MaskRect {
  left: number
  top: number
  width: number
  height: number
}

interface LineBox {
  left: number
  top: number
  width: number
  height: number
}

// Tunable knobs for the headline's reveal mask — kept as one named block
// so they're easy to dial in (there's a companion control tool that
// mirrors these exact names/ranges for live-tuning; paste its output back
// here). Every edge-walk draw either bites inward (→ bites, genuinely
// covering/hiding part of a letter via the mask — see .sentence-masked),
// stays flush, or extends outward (→ base, behind the text). Archivo Bold
// at this size has a cap-height around 85px and stroke weights around
// 16-20px — BITE_MIN/MAX are sized off that (a shallow bite just notches
// a stroke's edge, a deep one can eat most of a letter's width); a
// different display font would want these re-tuned to its own
// proportions the same way.
const BITE_CHANCE = 0.48 // fraction of draws (on a biteable edge) that bite inward at all
const BITE_MIN = 15 // px, shallowest bite
const BITE_MAX = 23 // px, deepest bite
const FLUSH_CHANCE = 0.48 // of the non-biting draws, fraction that stay flush (0px) rather than extend
const EXTEND_MIN = 18 // px, smallest outward extension
const EXTEND_MAX = 40 // px, largest outward extension — capped: the background shouldn't bulge out too far
const SEGMENTS_PER_EDGE = 4 // top/bottom jumps per line — tuned live via the Reveal Mask Tuner artifact
const MASK_SEED = 42

interface ParagraphMask {
  // Behind the text — the readable backing. Always includes one safety
  // rect per line covering its exact glyph box (so a segment/band that
  // happens to pick a negative level never leaves anything unreadable),
  // plus the positive-level outward extensions.
  base: MaskRect[]
  // In FRONT of the text — the negative-level segments/bands, genuinely
  // covering/hiding part of a letter rather than just framing it.
  bites: MaskRect[]
}

// Only used on an edge that's a genuine OUTER boundary of the whole
// headline — every line's own left/right edge, the very top of the first
// line, the very bottom of the last line (allowBite true there). A line's
// top/bottom where it instead borders the *next* line only ever extends
// outward (allowBite false, never negative) — a notch there would cut a
// horizontal slice across the middle of a word.
function pickLevel(rand: () => number, allowBite: boolean): number {
  if (allowBite && rand() < BITE_CHANCE) {
    return -(BITE_MIN + rand() * (BITE_MAX - BITE_MIN))
  }
  if (rand() < FLUSH_CHANCE) return 0
  return EXTEND_MIN + rand() * (EXTEND_MAX - EXTEND_MIN)
}

function buildParagraphMask(lines: LineBox[]): ParagraphMask {
  const rand = mulberry32(MASK_SEED)
  const base: MaskRect[] = []
  const bites: MaskRect[] = []

  lines.forEach((line, lineIndex) => {
    if (!line.width || !line.height) return
    const isFirstLine = lineIndex === 0
    const isLastLine = lineIndex === lines.length - 1

    // Safety net — guarantees full readability independent of whatever
    // the edge walk below picks.
    base.push({ left: line.left, top: line.top, width: line.width, height: line.height })

    // Top/bottom edges: a few segments — just a couple of jumps partway
    // across, not a staircase. Only the line's own true outer edge (first
    // line's top, last line's bottom) can notch inward.
    const segCount = SEGMENTS_PER_EDGE
    const segWidth = line.width / segCount
    for (let i = 0; i < segCount; i++) {
      const segLeft = line.left + i * segWidth
      const w = segWidth + 1

      let topLevel = pickLevel(rand, isFirstLine)
      let bottomLevel = pickLevel(rand, isLastLine)
      // If both edges of the same segment bite inward, clamp their
      // combined depth to under half the line height — a segment can
      // still lose real height off the top AND the bottom, just never
      // enough to slice a letter clean through.
      if (topLevel < 0 && bottomLevel < 0 && -topLevel - bottomLevel > line.height * 0.5) {
        const scale = (line.height * 0.5) / (-topLevel - bottomLevel)
        topLevel = Math.round(topLevel * scale)
        bottomLevel = Math.round(bottomLevel * scale)
      }

      if (topLevel > 0) {
        base.push({ left: segLeft, top: line.top - topLevel, width: w, height: topLevel })
      } else if (topLevel < 0) {
        bites.push({ left: segLeft, top: line.top, width: w, height: -topLevel })
      }

      if (bottomLevel > 0) {
        base.push({ left: segLeft, top: line.top + line.height, width: w, height: bottomLevel })
      } else if (bottomLevel < 0) {
        bites.push({ left: segLeft, top: line.top + line.height + bottomLevel, width: w, height: -bottomLevel })
      }
    }

    // Left/right edges: one jump each, for the line's full height — this
    // (lines being different widths) is most of what makes the combined
    // 3-line silhouette read as stepped, so it stays simple: no internal
    // banding.
    {
      const leftLevel = pickLevel(rand, true)
      if (leftLevel > 0) {
        base.push({ left: line.left - leftLevel, top: line.top, width: leftLevel, height: line.height })
      } else if (leftLevel < 0) {
        bites.push({ left: line.left, top: line.top, width: -leftLevel, height: line.height })
      }

      const rightLevel = pickLevel(rand, true)
      if (rightLevel > 0) {
        base.push({ left: line.left + line.width, top: line.top, width: rightLevel, height: line.height })
      } else if (rightLevel < 0) {
        bites.push({ left: line.left + line.width + rightLevel, top: line.top, width: -rightLevel, height: line.height })
      }
    }
  })

  return { base, bites }
}

const sentencesEl = ref<HTMLElement | null>(null)
const sentenceRefs = ref<(HTMLElement | null)[]>([])
function setSentenceRef(el: Element | null, index: number) {
  sentenceRefs.value[index] = el as HTMLElement | null
}
const paragraphMask = ref<ParagraphMask>({ base: [], bites: [] })
function buildSentenceMasks() {
  const container = sentencesEl.value
  if (!container) return
  const containerRect = container.getBoundingClientRect()
  const lines: LineBox[] = sentenceRefs.value.map((el) => {
    if (!el) return { left: 0, top: 0, width: 0, height: 0 }
    const rect = el.getBoundingClientRect()
    return { left: rect.left - containerRect.left, top: rect.top - containerRect.top, width: rect.width, height: rect.height }
  })
  if (lines.some((l) => !l.width)) return
  paragraphMask.value = buildParagraphMask(lines)
}

// The "bank" — DECODE.cms/content/wiki, a media library page, not any one
// article's own images. `.filterBy('type', 'image')` excludes the one PDF
// in there; `.limit(10)` is the top of the "7 to 10" range asked for.
const { data: images } = await useAsyncData('splash:bank-images', () =>
  useKqlCollection<BankImage>({
    query: "page('wiki').files.filterBy('type', 'image').limit(10)",
    select: { url: true, alt: true },
  }),
)

// Doubled so the track can loop seamlessly: animating from translateX(0)
// to translateX(-50%) ends exactly where the first copy started.
const scrollingImages = computed(() => [...(images.value ?? []), ...(images.value ?? [])])

// Real photos here are nearly all landscape-ish — capping every image by
// max-height alone and letting width follow its true ratio technically
// preserves "true size", but in practice almost all of them hit the same
// height ceiling, so only width ends up visibly varying. Cycling a
// different height cap per image forces the height itself to vary too,
// which is what actually reads as "rhythm". Index is reduced mod the
// *original* (undoubled) image count first — otherwise, since 10 doesn't
// divide evenly by the variant count, the second copy falls out of phase
// with the first and the loop gets a visible seam instead of looking
// infinite.
//
// This cap is applied in *pixels* (imagesBandHeight, measured below), not
// a CSS percentage: a percentage `max-height` only resolves against a
// parent with a definite height, and .splash-image-wrapper deliberately
// has no explicit height (it shrink-wraps to the image, which is what
// lets .image-label land exactly on the image's own top-left corner
// instead of a taller, centered wrapper's). Without a definite parent
// height the percentage is simply ignored, so every image rendered at
// its full natural size — one `will-change: filter` paint context's
// bounding box away from matching the label at all.
const HEIGHT_VARIANTS = [1, 0.45, 0.8, 0.35, 0.95, 0.55, 0.7, 0.4]
function imageHeight(index: number) {
  const n = images.value?.length || 1
  const variant = HEIGHT_VARIANTS[(index % n) % HEIGHT_VARIANTS.length] ?? 1
  // imagesBandHeight starts at 0 until computeGrid's first measurement on
  // mount — fall back to the CSS band height (44vh) so there's no brief
  // (or, if that measurement ever fails to land, permanent) 0px/invisible
  // flash before it resolves.
  const bandHeight = imagesBandHeight.value || (import.meta.client ? window.innerHeight * 0.44 : 0)
  return `${variant * bandHeight}px`
}
function imageBadgeColor(index: number) {
  const n = images.value?.length || 1
  return BADGE_COLORS[(index % n) % BADGE_COLORS.length]
}

// JS-driven hover instead of CSS `:hover` — more reliable here: Chromium
// can fail to repaint an SVG `filter: url(#id)` in response to a `:hover`
// state change on an element inside an animated/transformed ancestor
// (this track). An explicit class forced with `!important` sidesteps that
// rather than depending on the browser to notice the state change.
//
// Deliberately does NOT pause the scroll on hover (it used to): the band
// is now large enough (44vh, nearly full width) that a cursor merely
// resting over it while reading something else kept incidentally
// triggering the pause, which is what made the "infinite" scroll read as
// stuck/not actually continuous. The color-reveal itself doesn't depend
// on the image holding still — the class still toggles correctly on
// whichever image is under the cursor at any instant, moving or not.
const hoveredIndex = ref<number | null>(null)

const { data: articleTitles } = await useAsyncData('splash:article-titles', () =>
  useKqlCollection<ArticleTitle>({
    query: "site.children.filterBy('intendedTemplate', 'default')",
    select: { title: true },
  }),
)

// Pixel-art country silhouettes (DECODE.cms/content/splash_screen, copied
// into public/splash/ — no content.txt there, so not a real Kirby page to
// query). Positioned as percentages of the *grid itself* (.splash-countries
// below reuses gridStyle's own top/left/right/bottom), each centered on
// its coordinate (translate(-50%,-50%), applied in the template alongside
// rotate/scale below).
//
// Four knobs per icon, each independently easy to tweak:
//   top/left  — position, % of the grid
//   width     — base size in px (its own aspect ratio sets the height)
//   rotate    — degrees, clockwise, default 0
//   scale     — multiplier on top of width, default 1 (e.g. 1.2 = 20% bigger)
// rotate/scale default to 0/1 for every icon below (no visual change from
// before) — set either on a specific entry to adjust just that icon.
//
// The scrolling image band covers a tall middle slice of the grid (roughly
// 21–79% of its height, measured live) and spans its full width, so no x
// position escapes it — only a top or bottom *strip*, clear of that
// vertical range, does. All nine therefore live in the top strip (≤~20%)
// or bottom strip (≥~76%), sized so even the largest doesn't reach into
// the band, and never above it in z-order (.splash-countries is rendered
// *before* .splash-images below — equal z-index, so DOM order puts the
// images on top, not these). Horizontal spread (24–80%) stays clear of the
// corner titles' own boxes (roughly the outer 0–17%/83–100% on each side).
// Note: rotating/scaling an icon can push its corners outside these
// margins (most visibly at the band boundary) — recheck after a big
// change.
interface CountryIcon {
  src: string
  top: string
  left: string
  width: number
  rotate?: number
  scale?: number
}

const COUNTRY_ICONS: CountryIcon[] = [
  { src: '/splash/pe.svg', top: '84.4%', left: '48.2%', width: 60, rotate: 0, scale: 1 },
  { src: '/splash/group-43.svg', top: '25.6%', left: '82.8%', width: 110, rotate: 0, scale: 1.75 },
  { src: '/splash/ca.svg', top: '19.8%', left: '3.8%', width: 100, rotate: 96, scale: 1.75 },
  { src: '/splash/cd.svg', top: '23.1%', left: '65.5%', width: 65, rotate: 0, scale: 1.2 },
  { src: '/splash/variant2.svg', top: '25.1%', left: '96.3%', width: 40, rotate: 0, scale: 1.25 },
  { src: '/splash/group-42.svg', top: '73.7%', left: '88.5%', width: 110, rotate: -65, scale: 1.75 },
  { src: '/splash/br.svg', top: '72.3%', left: '8.5%', width: 100, rotate: 0, scale: 1.8 },
  { src: '/splash/ml.svg', top: '20.7%', left: '34.6%', width: 80, rotate: 0, scale: 1 },
  { src: '/splash/group-45.svg', top: '89%', left: '80%', width: 55, rotate: 0, scale: 1 },
]

// Each one sits near a different corner of the grid, but with its own
// offsets rather than a mirrored, uniform 4-up layout ("laid differently").
// Positions (cornerStyles, computeGrid below) are computed in px from the
// grid's own measured bounds, not independent hand-picked percentages —
// that's what guarantees they can never land outside the grid regardless
// of viewport size, rather than just happening to look right at one.
const cornerStyles = ref<Record<string, string>[]>([{}, {}, {}, {}])

const { data: info } = await useAsyncData('splash:info', () =>
  useKql<SiteInfo | null>({
    query: "site.children.filterBy('intendedTemplate', 'site_infos').first",
    select: {
      title: true,
      header_subtitle: true,
      // `true` on a `structure` field returns its raw, unparsed YAML
      // string — `.toStructure` resolves it into actual row objects.
      sentences: 'page.content.sentences.toStructure',
      // A `writer` field — HTML, typically just a single `<p>`. Stripped
      // to plain text below (informationsText) for the tab's ticker.
      informations: true,
    },
  }),
)
// `long_description` used to render here too, right under `header_subtitle`
// — nearly the same sentence twice. Dropped so there's one paragraph, not
// two near-duplicates.

// Plain text for the folder-tab's scrolling ticker — `informations` comes
// back as writer-field HTML (normally one `<p>...</p>`), not safe/useful
// to drop into a marquee as-is.
const informationsText = computed(() => (info.value?.informations ?? '').replace(/<[^>]+>/g, '').trim())

// Cell size is recalculated (not a fixed 80px) so the grid — confined to
// the splash section's own size minus the (now homogeneous — see
// computeGrid's `margin`) margin on every side — divides into whole
// cells: a fixed 80px would leave a clipped partial cell at the far edge,
// cutting off its outline. Width and height are fit independently (cells
// can end up slightly rectangular rather than perfectly square) so each
// axis gets a whole number of cells with no leftover.
const SQUARE_TARGET = 80

// Folder-tab silhouette above the grid: a long flat top line with steep
// (~70-74°) diagonal "shoulders" down to a lower baseline at each edge,
// each shoulder blended into its adjacent straight segment with a small
// rounded join (not a uniform border-radius rectangle — the diagonals and
// roundings are drawn directly into the path).
//
// Sized as a fraction of the viewport — 1/4 width, 5% height, 3% top
// margin — rather than the full splash width. The two diagonals' spans and
// the corner radius are also scaled off the tab's own height (not fixed
// px), at the same ratios as the original 80px-tall version
// (22/80, 27/80, 8/80), so the ~70-74° shoulder angle stays the same at
// any tab height instead of flattening out as the tab shrinks.
const TAB_LEFT_DX_RATIO = 22 / 80
const TAB_RIGHT_DX_RATIO = 27 / 80
const TAB_CORNER_R_RATIO = 8 / 80
const tabWidth = ref(0)
const tabHeight = ref(0)
const tabTop = ref(0)
// Full viewport width — the baseline rule (folderTabPath below) is drawn
// as part of the same path/stroke all the way out to this, rather than as
// a second, separately-positioned element. Two elements meeting edge to
// edge is exactly what kept producing a hairline gap or vertical
// misalignment between them (sub-pixel rounding between the SVG's
// internal viewBox geometry and the rule div's own CSS box) — one
// continuous stroke can't be disconnected from itself.
const pageWidth = ref(0)

// How far the shape's top line is inset from each side at y:0 — the
// narrowest horizontal extent of the trapezoid. Exposed (not just a local
// in folderTabPath) because the ticker also needs it, to clip itself to
// this narrower span rather than the full tabWidth bounding box — a
// rectangle matching tabWidth lets ticker text render out past the
// diagonal shoulders, into the corner outside the actual white fill.
const tabLeftInset = computed(() => tabHeight.value * TAB_LEFT_DX_RATIO)
const tabRightInset = computed(() => tabHeight.value * TAB_RIGHT_DX_RATIO)

const folderTabPath = computed(() => {
  const w = tabWidth.value
  const h = tabHeight.value
  const pw = pageWidth.value
  if (!w || !h || !pw) return ''
  const leftDx = tabLeftInset.value
  const rightDx = tabRightInset.value
  const cornerR = h * TAB_CORNER_R_RATIO

  // Left shoulder: diagonal from (0,h) up to the apex (leftDx,0), rounded
  // by blending cornerR back along the diagonal and forward along the
  // (horizontal, so purely +x) top line around that apex.
  const leftLen = Math.hypot(leftDx, h)
  const leftUx = leftDx / leftLen
  const leftUy = h / leftLen
  const leftBefore = { x: leftDx - cornerR * leftUx, y: cornerR * leftUy }
  const leftAfter = { x: leftDx + cornerR, y: 0 }

  // Right shoulder: top line arrives at apex (w-rightDx,0), then descends
  // to (w,h). Same blend, mirrored.
  const rightLen = Math.hypot(rightDx, h)
  const rightUx = rightDx / rightLen
  const rightUy = h / rightLen
  const rightApexX = w - rightDx
  const rightBefore = { x: rightApexX - cornerR, y: 0 }
  const rightAfter = { x: rightApexX + cornerR * rightUx, y: cornerR * rightUy }

  // No closing `Z`: the path stops at the last point (pw,h) rather than
  // drawing a stroked edge back along the bottom to (0,h). Without an
  // explicit close, only the drawn segments above get a stroke — fill
  // still works (an unclosed subpath is implicitly closed for fill
  // purposes, per the SVG spec, just not stroked, so the white tab fill
  // doesn't bleed across the extension line's full width). This is also
  // what fixed the uneven stroke-thickness bug: with `Z`, the bottom edge
  // met each diagonal's shoulder at a sharp, near-180°-apart miter join,
  // and the default miter linejoin spiked the visible stroke width right
  // at both bottom corners.
  return [
    `M 0,${h}`,
    `L ${leftBefore.x.toFixed(2)},${leftBefore.y.toFixed(2)}`,
    `Q ${leftDx.toFixed(2)},0 ${leftAfter.x.toFixed(2)},${leftAfter.y.toFixed(2)}`,
    `L ${rightBefore.x.toFixed(2)},${rightBefore.y.toFixed(2)}`,
    `Q ${rightApexX.toFixed(2)},0 ${rightAfter.x.toFixed(2)},${rightAfter.y.toFixed(2)}`,
    `L ${w},${h}`,
    // The baseline rule — same path, same stroke, out to the full
    // viewport width.
    `L ${pw},${h}`,
  ].join(' ')
})

const splashEl = ref<HTMLElement | null>(null)
const imagesEl = ref<HTMLElement | null>(null)
const gridStyle = ref<Record<string, string>>({})
// The CTA's own center lands exactly on the grid's bottom line, so it
// needs the same margin the grid uses — kept separate from gridStyle
// since it's consumed by a different element.
const ctaStyle = ref<Record<string, string>>({})
// .splash-images' own rendered height, in px — see imageHeight() above for
// why this drives the per-image max-height instead of a CSS percentage.
const imagesBandHeight = ref(0)

function computeGrid() {
  if (!splashEl.value) return

  // Measured off the section itself, not window.innerHeight — `.splash`'s
  // height is `100vh - var(--footer-height)`, not the full viewport.
  const { width: boxW, height: boxH } = splashEl.value.getBoundingClientRect()

  // The tab's own sizing is specified against the *viewport*, not the
  // splash box (which is already a few vh short, for the footer) — and
  // since .splash starts at the very top of the page, a top-of-viewport
  // offset is also a top-of-splash offset.
  tabWidth.value = window.innerWidth * 0.25
  tabHeight.value = window.innerHeight * 0.035
  tabTop.value = window.innerHeight * 0.015
  pageWidth.value = window.innerWidth

  // One margin value, identical on all four sides of the grid: left,
  // right, bottom (the gap above the footer), and — tying it to the tab —
  // the *gap between the tab's own bottom edge and the grid's top line*,
  // not the tab's whole footprint.
  const margin = window.innerHeight * 0.075
  const gridTop = tabTop.value + tabHeight.value + margin
  const usableW = boxW - margin * 2
  const usableH = boxH - gridTop - margin

  const cols = Math.max(1, Math.round(usableW / SQUARE_TARGET))
  const rows = Math.max(1, Math.round(usableH / SQUARE_TARGET))
  const cellWidth = usableW / cols
  const cellHeight = usableH / rows

  gridStyle.value = {
    top: `${gridTop}px`,
    bottom: `${margin}px`,
    left: `${margin}px`,
    right: `${margin}px`,
    backgroundSize: `${cellWidth}px ${cellHeight}px`,
  }

  ctaStyle.value = { top: `${boxH - margin}px` }

  // Each corner title is inset *past* the grid's own margin by a further
  // fixed amount (with a little per-corner variation — "laid differently"
  // rather than a mirrored 4-up layout), and capped to a max-width/height
  // derived from the grid's own usable size — never an independent
  // guess that could outgrow it on some viewport.
  const cornerMaxWidth = Math.min(usableW * 0.22, 260)
  const cornerMaxHeight = usableH * 0.26
  // -14 compensates for .splash-corner's own padding (room for the
  // overlapping badge) so the title text lands at roughly the same visual
  // inset as before that padding was added. Top corners inset from
  // gridTop (the larger of the two, on account of the tab above it), not
  // the plain side margin.
  const insetX = margin + 20 - 14
  const insetYTop = gridTop + 16 - 14
  const insetYBottom = margin + 16 - 14
  const common = { maxWidth: `${cornerMaxWidth}px`, maxHeight: `${cornerMaxHeight}px`, overflow: 'hidden' }
  cornerStyles.value = [
    { ...common, top: `${insetYTop}px`, left: `${insetX}px` },
    { ...common, top: `${insetYTop + 14}px`, right: `${insetX + 10}px` },
    { ...common, bottom: `${insetYBottom + 6}px`, left: `${insetX + 14}px` },
    { ...common, bottom: `${insetYBottom + 18}px`, right: `${insetX}px` },
  ]

  if (imagesEl.value) {
    imagesBandHeight.value = imagesEl.value.getBoundingClientRect().height
  }
}

function handleResize() {
  computeGrid()
  buildSentenceMasks()
}

onMounted(() => {
  computeGrid()
  buildSentenceMasks()
  window.addEventListener('resize', handleResize)
  // The display font loads async (main.css `@import`) — if it swaps in
  // after this first measurement, the lines' widths shift and the mask
  // no longer matches. Re-measure once it's actually settled.
  document.fonts?.ready?.then(buildSentenceMasks)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <section ref="splashEl" class="splash">
    <!-- Folder-tab silhouette, above the grid: 1/4 viewport width, 3.5%
         viewport height, 1.5% top margin. The path (folderTabPath) draws
         the tab AND the baseline rule past it as one continuous stroke,
         out to the full viewport width — two separate elements kept
         producing a hairline gap or vertical misalignment where they were
         supposed to meet, which one unbroken path can't. -->
    <svg
      v-if="folderTabPath"
      class="splash-tab"
      :style="{ top: `${tabTop}px` }"
      :viewBox="`0 0 ${pageWidth} ${tabHeight}`"
      :width="pageWidth"
      :height="tabHeight"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        :d="folderTabPath"
        fill="#fff"
        stroke="#000"
        stroke-width="1"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <!-- Scrolling ticker (CMS `informations` field). Clipped to the
         trapezoid's own *top-line* span (tabLeftInset/tabRightInset), not
         the full tabWidth bounding box — the shape is narrower than
         tabWidth near the top (that's what the diagonal shoulders are),
         so a plain tabWidth-wide clip let text render out past them, into
         the corner outside the actual white fill. A further 2% of that
         narrower span is padded in on each side so text fades out before
         reaching the shoulders at all, rather than getting cut off flush
         against them. Same doubled-content/translateX(-50%) loop
         technique as the image band below. -->
    <div
      v-if="informationsText"
      class="splash-tab-ticker"
      :style="{
        top: `${tabTop}px`,
        left: `${tabLeftInset}px`,
        width: `${tabWidth - tabLeftInset - tabRightInset}px`,
        height: `${tabHeight}px`,
        paddingLeft: `${(tabWidth - tabLeftInset - tabRightInset) * 0.02}px`,
        paddingRight: `${(tabWidth - tabLeftInset - tabRightInset) * 0.02}px`,
      }"
      aria-hidden="true"
    >
      <div class="splash-tab-ticker-track text-h4">
        <span>{{ informationsText }}</span>
        <span>{{ informationsText }}</span>
      </div>
    </div>

    <div class="splash-grid" :style="gridStyle" aria-hidden="true" />

    <div
      v-for="(article, index) in (articleTitles ?? []).slice(0, 4)"
      :key="article.title"
      class="splash-corner"
      :style="cornerStyles[index]"
    >
      <div class="corner-title-wrap">
        <span class="corner-badge" :style="{ backgroundColor: BADGE_COLORS[index % BADGE_COLORS.length] }">
          {{ index + 1 }}
        </span>
        <div class="corner-title">{{ article.title }}</div>
      </div>
    </div>

    <!-- Deliberately *before* .splash-images in the DOM — same z-index (1),
         so render order breaks the tie in the images' favor: these sit
         behind the scrolling band, never above it. Reuses gridStyle's own
         bounds, so percentage positions inside are guaranteed relative to
         the grid, not the viewport. -->
    <div class="splash-countries" :style="gridStyle" aria-hidden="true">
      <img
        v-for="icon in COUNTRY_ICONS"
        :key="icon.src"
        :src="icon.src"
        class="splash-country no-duotone"
        :style="{
          top: icon.top,
          left: icon.left,
          width: `${icon.width}px`,
          transform: `translate(-50%, -50%) rotate(${icon.rotate ?? 0}deg) scale(${icon.scale ?? 1})`,
        }"
      >
    </div>

    <!-- Behind .splash-info (lower z-index) — a background layer, not a
         band confined to the margin strip, now that it's centered in the
         viewport like the text is. -->
    <div v-if="images?.length" ref="imagesEl" class="splash-images" aria-hidden="true">
      <div class="splash-images-track">
        <div v-for="(image, index) in scrollingImages" :key="`${image.url}-${index}`" class="splash-image-wrapper">
          <span v-if="image.alt" class="image-label text-h4" :style="{ backgroundColor: imageBadgeColor(index) }">
            {{ image.alt.split(' ')[0] }}
          </span>
          <img
            :src="image.url"
            :alt="image.alt || ''"
            :class="{ 'is-hovered': hoveredIndex === index }"
            :style="{ maxHeight: imageHeight(index) }"
            @mouseenter="hoveredIndex = index"
            @mouseleave="hoveredIndex = null"
          >
        </div>
      </div>
    </div>

    <div class="splash-info">
      <div v-if="info?.sentences?.length" ref="sentencesEl" class="splash-sentences">
        <!-- Both the white backing (.sentence-fill) and the text itself
             live inside this one wrapper, which has an SVG mask
             (#splash-headline-mask, below) applied to it — `base` rects
             are the mask's visible (white) region, `bites` are painted
             black *into* that same mask, actually punching holes rather
             than sitting on top as an opaque patch. Where a bite lands,
             the whole wrapper — backing and letter ink both — goes
             transparent, revealing whatever is behind the headline (grid,
             photo band) through it, like the piece hasn't been decoded. -->
        <div class="sentence-masked">
          <div class="sentence-fill" aria-hidden="true" />
          <div
            v-for="(item, index) in info.sentences"
            :key="index"
            class="sentence-line"
            :style="{ transform: `translateX(${sentenceOffset(index)})` }"
          >
            <span class="sentence-text" :ref="(el) => setSentenceRef(el as Element | null, index)">{{ item.sentence }}</span>
          </div>
        </div>
        <svg class="sentence-mask-defs" aria-hidden="true">
          <mask id="splash-headline-mask" maskUnits="userSpaceOnUse" x="-500" y="-500" width="3000" height="1500">
            <rect
              v-for="(rect, ri) in paragraphMask.base"
              :key="`b${ri}`"
              fill="#fff"
              :x="rect.left"
              :y="rect.top"
              :width="rect.width"
              :height="rect.height"
            />
            <rect
              v-for="(rect, bi) in paragraphMask.bites"
              :key="`n${bi}`"
              fill="#000"
              :x="rect.left"
              :y="rect.top"
              :width="rect.width"
              :height="rect.height"
            />
          </mask>
        </svg>
      </div>
      <!-- Manual break after "disinformation" — the rest wraps on its own
           into two more lines at this width, so three lines total. -->
      <div v-if="info?.header_subtitle" class="text-h3 splash-subtitle">
        <span class="splash-subtitle-box">
          An open multimedia guide exploring disinformation<br>
          through investigations, interactive tools and collaborative workshops for youth
        </span>
      </div>
    </div>

    <!-- Its own element (not inside .splash-info, which is centered on the
         full viewport) so its vertical position can be pinned to the
         grid's bottom line instead. -->
    <button type="button" class="splash-cta" :style="ctaStyle" @click="$emit('continue')">
      Enter the investigation guide
    </button>
  </section>
</template>

<style scoped>
.splash {
  position: relative;
  /* Leaves exactly enough room for SiteFooter.vue below it, so the splash
     + footer together fit one screen with no scrolling. */
  height: calc(100vh - var(--footer-height));
  overflow: hidden;
  /* Tune the scrolling banner's image width range here — a very wide or
     very narrow source photo otherwise renders at whatever width its own
     aspect ratio implies once height is capped (see .splash-images-track
     img below), with no ceiling/floor. */
  --splash-image-min-width: 120px;
  --splash-image-max-width: 560px;
}

/* Folder-tab silhouette (+ the baseline rule past it, same path) — path
   geometry lives in folderTabPath (script), this just places/stacks the
   <svg>. `top` is set inline (tabTop, 1.5% of viewport height). Sits
   above everything else — a small tab in the corner, not meant to
   compete with anything for a stacking tier the way the grid/images/text
   layers do. `overflow: visible` so the stroke's own half-width, which
   paints slightly outside the path geometry (stroke is centered on the
   path by default), isn't clipped off at the SVG's nominal top edge. */
.splash-tab {
  position: absolute;
  left: 0;
  z-index: 3;
  display: block;
  overflow: visible;
}

/* Ticker text — left/width come from tabLeftInset/tabRightInset (inline
   style), clipping to the trapezoid's own top-line span rather than the
   full tabWidth bounding box (see the template comment), plus a further
   2% of that span as inner padding so text fades out before reaching the
   diagonal shoulders rather than getting cut off flush against them.
   Layered above the tab's own path (z-index 4 > 3). */
.splash-tab-ticker {
  position: absolute;
  z-index: 4;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.splash-tab-ticker-track {
  display: flex;
  white-space: nowrap;
  width: max-content;
  /* Scrolls right to left — translateX(0) to (-50%) moves the (doubled)
     content leftward, so new text keeps entering from the right. Exactly
     half the track's width is where the first copy started, so the loop
     has no visible seam (same technique as .splash-images-track). */
  animation: splash-tab-ticker-scroll 20s linear infinite;
}

.splash-tab-ticker-track span {
  padding-right: 3rem;
}

@keyframes splash-tab-ticker-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.splash-info {
  position: relative;
  z-index: 2;
}

/* Black 1px outline per cell — adjacent cells share grid lines, so this
   draws actual outlined cells rather than doubled-up borders. Position and
   background-size come from `gridStyle` (computeGrid), not fixed here.
   The repeating background only draws a line at each tile's *start*
   (left/top), so the closing line at the container's own right/bottom
   edge falls exactly on the boundary and gets clipped — an explicit
   border fills in that last line. */
.splash-grid {
  position: absolute;
  z-index: 0;
  background-image:
    linear-gradient(to right, #000 1px, transparent 1px),
    linear-gradient(to bottom, #000 1px, transparent 1px);
  border-right: 1px solid #000;
  border-bottom: 1px solid #000;
}

.splash-info {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
}

.splash-subtitle {
  /* No gap — sits right against the headline. Its own z-index (above
     .splash-sentences) means it's never at risk of the headline's mask
     extension painting over it, even with zero margin: .splash-subtitle-
     box's own white background simply wins the overlap. */
  position: relative;
  z-index: 1;
  margin-top: 0;
}

.splash-subtitle-box {
  /* White rectangle sized to the text, not the other way round — inline
     so the box hugs exactly the three lines of text inside it. */
  display: inline-block;
  background: #fff;
  padding: 12px;
  /* Wide enough for "AN OPEN MULTIMEDIA GUIDE EXPLORING DISINFORMATION" on
     one line; the second sentence wraps on its own into two more. */
  max-width: 52ch;
  line-height: 1.15;
  text-align: center;
}

.splash-cta {
  position: absolute;
  left: 50%;
  /* `top` (the grid's bottom line, in px) comes from `ctaStyle` —
     centers this button's own box exactly on that line. */
  transform: translate(-50%, -50%);
  z-index: 2;
  background-color: #a68764;
  color: #fff;
  border: none;
  border-radius: 0;
  padding: 18px;
  font-family: Arial, Helvetica, sans-serif;
  text-transform: uppercase;
  cursor: pointer;
}

/* Article titles near the grid's four corners. Position, max-width and
   max-height all come from cornerStyles (computeGrid) — computed in px
   from the grid's own measured bounds, which is what guarantees these
   stay inside it on any viewport rather than an independent percentage
   guess that only happens to fit at one size. */
.splash-corner {
  position: absolute;
  z-index: 2;
  font-family: Garamond, 'EB Garamond', serif;
  font-weight: 500;
  font-size: 34px;
  text-align: center;
  /* Room for .corner-badge below, which deliberately overlaps *outward*
     past the title's own top-left corner — without this padding, that
     overlap fell outside this box and `overflow: hidden` (cornerStyles,
     computeGrid — the "never outside the grid" safety net) silently
     clipped the badge/number entirely. */
  padding: 14px 0 0 14px;
}

/* Shrink-wraps to the title's own width (text-align:center on the parent
   still centers this block as a whole) — the badge below is positioned
   relative to *this*, not the title text's line box, so its corner can
   land on the actual glyphs rather than the box edges. */
.corner-title-wrap {
  position: relative;
  display: inline-block;
}

/* line-height: 1 — the default leading would otherwise push the "top" of
   the title's box well above where the letters actually start, misaligning
   the badge against the box edge rather than the "T" of the first word. */
.corner-title {
  line-height: 1;
}

/* Centered exactly on the title wrap's top-left corner point (half the
   badge overlapping in, half out) — "way closer" than the previous
   fully-outside placement, which just touched that corner from outside. */
.corner-badge {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 4px;
  font-family: 'Martian Mono', monospace;
  font-weight: 400;
  font-size: 20px;
  color: #000;
}

/* Pixel-art country silhouettes (public/splash/*.svg), scattered like
   markers on a map. This wrapper reuses gridStyle's own top/left/right/
   bottom, so the percentage positions on each icon below are relative to
   the grid's actual drawn area, not the viewport — keeping the 12–88%
   coordinate range (COUNTRY_ICONS) safely inside it regardless of
   viewport size. */
.splash-countries {
  position: absolute;
  z-index: 1;
  pointer-events: none;
}

.splash-country {
  /* transform (translate/rotate/scale) is per-icon, set inline from
     COUNTRY_ICONS (script) — not fixed here. */
  position: absolute;
  height: auto;
}

/* Display text — Archivo bold (700), same family/weight as the footer
   brand (see main.css for the import) — a free stand-in for Extraset's
   Plakat, a commercial font (Anton was tried first but reads as too
   condensed here; Archivo Black was tried next but reads as too heavy).
   No list styling since this is now plain stacked divs, not a <ul>. Each
   line's translateX (inline style, sentenceOffset) staggers them instead
   of sharing one center axis. */
.splash-sentences {
  position: relative;
  font-family: 'Archivo', sans-serif;
  font-weight: 700;
  font-size: 120px;
  line-height: 1;
  text-transform: uppercase;
}

/* The white backing (.sentence-fill) and the text together, both clipped
   by the SAME SVG mask (#splash-headline-mask, template) — this is what
   makes a "bite" an actual hole (see through to whatever's behind the
   headline) instead of an opaque patch sitting on the letter: the mask
   doesn't know or care that there's text inside it, it just cuts the
   whole wrapper's painted output down to the irregular shape. */
.sentence-masked {
  position: relative;
  mask-image: url(#splash-headline-mask);
  -webkit-mask-image: url(#splash-headline-mask);
}

/* Plain solid fill — the mask alone carves it down to the exact irregular
   silhouette (buildParagraphMask's `base` rects), so this just needs to
   generously over-cover every line's own measured box; -80px comfortably
   clears the largest possible extension (46px) with room to spare. */
.sentence-fill {
  position: absolute;
  inset: -80px;
  background: #fff;
}

.sentence-line {
  /* text-align:center is inherited from .splash-info — .sentence-text
     being inline-block (not the line's own full-width block) is what lets
     it actually center on its own tight content width. No gap between
     lines — kept tight on purpose; the mask's own line boxes already
     fully cover each line regardless. */
  position: relative;
  text-align: center;
}

.sentence-text {
  display: inline-block;
}

/* Houses #splash-headline-mask only — never rendered itself. */
.sentence-mask-defs {
  position: absolute;
  width: 0;
  height: 0;
}

/* Full-width, vertically centered in the viewport behind .splash-info,
   like a backdrop. Bigger overall than before, same relative rhythm
   (HEIGHT_VARIANTS ratios unchanged, just a taller band to scale into),
   tighter gap between images, scrolling right to left forever.
   Deliberately NOT justify-content:center — the track (both copies) is
   much wider than the viewport, so centering it gives the track a static
   left offset before the animation even starts. The translateX(-50%)
   keyframe below assumes the track starts flush at this container's own
   left edge (x:0); with the centering offset added on top, the track's
   content stopped fully covering the viewport for part of each cycle —
   visible empty space right before the loop snapped back to the start. */
.splash-images {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 0;
  right: 0;
  height: 44vh;
  transform: translateY(-50%);
  overflow: hidden;
  display: flex;
}

.splash-images-track {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: max-content;
  height: 100%;
  animation: splash-scroll 100s linear infinite;
}

/* Shrink-wraps to the image's own rendered size — it used to stretch to
   the track's full height with the (shorter) image centered inside, which
   put the label (pinned to the wrapper's top:0) above the image rather
   than at its actual top edge. Cross-axis centering of wrappers of
   different heights against each other now comes from the track's own
   align-items:center instead. */
.splash-image-wrapper {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.splash-images-track img {
  width: auto;
  min-width: var(--splash-image-min-width);
  max-width: var(--splash-image-max-width);
  flex-shrink: 0;
  /* Once min/max-width actually clamps a given image, its natural ratio
     no longer matches the box exactly — crop rather than stretch/squish. */
  object-fit: cover;
  /* Own compositing layer — part of the :hover repaint fix below. */
  will-change: filter;
}

.splash-images-track img.is-hovered {
  filter: none !important;
}

.image-label {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  padding: 2px 6px;
  font-family: 'Martian Mono', monospace;
  text-transform: uppercase;
  white-space: nowrap;
}

@keyframes splash-scroll {
  from {
    transform: translateX(0);
  }
  to {
    /* Exactly half the track's width, since it's two identical copies of
       the image list back to back — lands precisely where the first copy
       started, so the loop has no visible seam. */
    transform: translateX(-50%);
  }
}
</style>
