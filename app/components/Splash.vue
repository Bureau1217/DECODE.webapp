<script setup lang="ts">
import { decipherFrom, decipherIn, scrambleOut } from '~/utils/decipher'
import type { CategoryWithTags } from '~/composables/useKeywordsPanelCategories'
import { SHAPE_DRAWN, cellPaths, generateMass, morphSteps, mulberry32, refineMass, resizeMass, stampMass } from '~/utils/splashShape'

// Decorative intro screen — fails soft (empty state, no thrown error) if
// the CMS call doesn't come back, since this isn't core content.

interface BankImage {
  url: string
  alt?: string
}

interface ArticleTitle {
  title: string
  id: string
}

interface SiteInfo {
  title: string
  header_subtitle?: string
  sentences?: { sentence: string }[]
}

const emit = defineEmits<{ continue: [] }>()

// The top-left tab.
const TAB_TEXT = 'Graduate Institute - Albert Hirschman Centre on Democracy'
const TAB_LINK = 'https://www.graduateinstitute.ch/international-programmes/decode-decryptons-co-creons-debattons'

// Which composition: the images in a band through the middle, behind the headline,
// or (?splash=shelf) the headline up top and the images on a shelf along the bottom.
const shelfLayout = useRoute().query.splash === 'shelf'

// Warm the keywords panel's data while the splash is up — see
// useKeywordsPanelCategories. Not awaited: the splash doesn't need it.
const keywordsLoading = useKeywordsPanelCategories().catch(() => {})
// On the server it's waited for: the image labels below depend on it, and
// server and browser have to render the same thing.
if (import.meta.server) await keywordsLoading

// The image band's corner labels are the Concepts keywords (the keywords
// panel's own "concepts" category, read from that same warmed cache),
// cycling across the images.
const keywordCache = useKeywordsPanelCache()
const language = useLanguage()
const keywordCategories = computed<CategoryWithTags[] | undefined>(() => keywordCache.value[language.value])
const conceptLabels = computed(() => keywordCategories.value?.find((c) => c.slug === 'concepts')?.tags.map((t) => t.title) ?? [])
function imageLabel(index: number, alt?: string) {
  const concepts = conceptLabels.value
  const label = concepts.length ? concepts[index % concepts.length] : alt?.split(' ')[0]
  if (!label || !shelfLayout) return label
  // Numbered like its color: the same three as the chapters (imageBadgeColor).
  const n = images.value?.length || 1
  return `0${(index % n) % BADGE_COLORS.length + 1} ${label}`
}

// BADGE_COLORS itself comes from app/utils/badgeColors.ts (Nuxt
// auto-import, same as badgeColorFor() in GuideCard.vue/ToolCard.vue) —
// this used to be its own local copy of that same array.

// Horizontal rhythm for the headline's lines, rather than all of them sharing
// one center axis: one line further left, the next further right, each
// headline starting on the opposite side from the one before. Sized off the
// font, and each line is held back by what's left of the screen on its own:
// a long line barely moves, a short one takes the whole shift.
const LINE_SHIFT_EM = 0.6
const HEADLINE_SIDE_MARGIN = 0.04 // of the viewport's width, each side
function sentenceOffset(index: number) {
  if (headlineWords.value.length < 2) return '0px'
  const fontSize = headlineFontSize.value
  const lineWidth = (lineWidthsEm.value[headlineIndex.value]?.[index] ?? 0) * fontSize
  const room = Math.max(0, (headlineMaxWidth.value - lineWidth) / 2)
  const side = (index + headlineIndex.value) % 2 === 0 ? -1 : 1
  return `${side * Math.min(LINE_SHIFT_EM * fontSize, room)}px`
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
// on every re-render — only a resize (new measured layout) or a new seed
// (the headline cycle, nextHeadline) changes it.
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
const BITE_MIN = 6 // px, shallowest bite (less room above the letters at this line height)
const BITE_MAX = 14 // px, deepest bite
const FLUSH_CHANCE = 0.48 // of the non-biting draws, fraction that stay flush (0px) rather than extend
const EXTEND_MIN = 18 // px, smallest outward extension
const EXTEND_MAX = 40 // px, largest outward extension — capped: the background shouldn't bulge out too far
const SEGMENTS_PER_EDGE = 4 // top/bottom jumps per line — tuned live via the Reveal Mask Tuner artifact
const MASK_SEED = 42
const MASK_SNAP = 24 // px at full size: the smallest step in the silhouette
const FRAME_SCREEN_MARGIN = 0.025 // mobile: of the window's width, kept clear each side of the frame

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

// Only used on the headline's very top and very bottom edge (allowBite true
// there). A line's top/bottom where it instead borders the *next* line only
// ever extends outward (allowBite false, never negative) — a notch there
// would cut a horizontal slice across the middle of a word. Same for a line's
// left/right edge: a bite there runs the line's whole height, chopping a
// vertical slice off its first or last letter.
// `scale` sizes the px knobs above to the headline's actual font size
// (they're tuned for the desktop's 120px).
function pickLevel(rand: () => number, allowBite: boolean, scale: number): number {
  if (allowBite && rand() < BITE_CHANCE) {
    return -(BITE_MIN + rand() * (BITE_MAX - BITE_MIN)) * scale
  }
  if (rand() < FLUSH_CHANCE) return 0
  return (EXTEND_MIN + rand() * (EXTEND_MAX - EXTEND_MIN)) * scale
}

// While a headline changes (shuffleFrame), each piece of the frame over letters
// still changing takes a passing level instead of its own, and lands on its own
// once they have. Its own levels are always drawn, so where it lands doesn't
// depend on the moment.
interface FrameShuffle {
  tick: number
  time: number // ms into the change
  targets: DOMRect[] // the new headline's lines as they'll end up
  settledAt: (line: number, from: number, to: number) => number // when that stretch of the line has landed
}

function buildParagraphMask(lines: LineBox[], scale = 1, seed = MASK_SEED, shuffle: FrameShuffle | null = null): ParagraphMask {
  const rand = mulberry32(seed)
  const base: MaskRect[] = []
  const bites: MaskRect[] = []
  const level = (allowBite: boolean, line: number, piece: number, from: number, to: number) => {
    const own = pickLevel(rand, allowBite, scale)
    if (!shuffle || shuffle.settledAt(line, from, to) <= shuffle.time) return own
    // Each piece changes every other tick, not all of them on each: a frame
    // changing whole at this pace would strobe.
    const passing = seed ^ Math.imul(line + 1, 73856093) ^ Math.imul(piece + 1, 19349663) ^ Math.imul(Math.floor((shuffle.tick + piece) / 2) + 1, 83492791)
    return pickLevel(mulberry32(passing), allowBite, scale)
  }

  lines.forEach((line, lineIndex) => {
    if (!line.width || !line.height) return
    const isFirstLine = lineIndex === 0

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

      let topLevel = level(isFirstLine, lineIndex, i * 2, i / segCount, (i + 1) / segCount)
      // Never a bite under the last line: it would open a gap above the subtitle's
      // box, which the outline would then draw a line along.
      let bottomLevel = level(false, lineIndex, i * 2 + 1, i / segCount, (i + 1) / segCount)
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
    // silhouette read as stepped, so it stays simple: no internal banding.
    const leftLevel = level(false, lineIndex, segCount * 2, 0, 0)
    if (leftLevel > 0) {
      base.push({ left: line.left - leftLevel, top: line.top, width: leftLevel, height: line.height })
    }
    const rightLevel = level(false, lineIndex, segCount * 2 + 1, 1, 1)
    if (rightLevel > 0) {
      base.push({ left: line.left + line.width, top: line.top, width: rightLevel, height: line.height })
    }
  })

  return { base, bites }
}

// Dark mode only: a darkened view of Europe under the grid, from NASA's Blue
// Marble (credit: NASA Earth Observatory), fetched only when dark mode is on.
const colorMode = useColorMode()
// /?nasa=world, /?nasa=south or /?nasa=broad: dark mode's map less centred on
// Europe, to compare (ToolCard.vue).
const NASA_VIEW = ['world', 'south', 'broad'].includes(String(useRoute().query.nasa)) ? String(useRoute().query.nasa) : 'europe'
const satelliteUrl = computed(() => (colorMode.value === 'dark' ? `/nasa/${NASA_VIEW}-splash.jpg` : null))

// The CMS headline list (site_infos.yml's "sentences"), which the splash
// cycles through. Each row is one headline, and a line break in it is a line
// on screen. A row with no line break gets one word per line. Older content
// had a single headline split one word per row — when every row is a single
// word, those rows are read as that one headline.
function headlineLines(sentence: string) {
  const lines = sentence.split(/\r?\n/).map((line) => line.trim().replace(/\s+/g, ' ')).filter(Boolean)
  return lines.length > 1 ? lines : (lines[0]?.split(' ') ?? [])
}
const headlines = computed(() => {
  const rows = (info.value?.sentences ?? []).map((row) => headlineLines(row.sentence ?? '')).filter((lines) => lines.length)
  if (rows.every((lines) => lines.length === 1)) return rows.length ? [rows.flat()] : []
  return rows
})
const headlineIndex = ref(0)
const headlineWords = computed(() => headlines.value[headlineIndex.value % Math.max(1, headlines.value.length)] ?? [])
const sentencesEl = ref<HTMLElement | null>(null)
const maskedEl = ref<HTMLElement | null>(null)
const sentenceRefs = ref<(HTMLElement | null)[]>([])
function setSentenceRef(el: Element | null, index: number) {
  sentenceRefs.value[index] = el as HTMLElement | null
}

// One font size for the whole cycle, the largest at which every line of every
// headline fits the screen (no line ever wraps), so the text never changes
// size between headlines. The block keeps the height of the tallest headline,
// so a shorter one doesn't move the subtitle under it.
const HEADLINE_MAX_FONT_SIZE = 120
const HEADLINE_MAX_FONT_SIZE_MOBILE = 0.13 // of the viewport's width
const HEADLINE_MAX_HEIGHT = shelfLayout ? 0.4 : 0.62 // of the splash's height
const HEADLINE_CLEARANCE = 84 // px kept free above and below the headline and subtitle
const HEADLINE_MAX_HEIGHT_MOBILE = shelfLayout ? 0.3 : 0.42
const HEADLINE_LINE_HEIGHT = 0.84
const headlineFontSize = ref(HEADLINE_MAX_FONT_SIZE)
const headlineMaxWidth = ref(0)
const lineWidthsEm = ref<number[][]>([])
const headlineMaxLines = computed(() => Math.max(1, ...headlines.value.map((lines) => lines.length)))
function fitHeadlines() {
  const container = sentencesEl.value
  const context = document.createElement('canvas').getContext('2d')
  if (!container || !splashEl.value || !context) return
  const { fontWeight, fontFamily } = getComputedStyle(container)
  context.font = `${fontWeight} 100px ${fontFamily}`
  lineWidthsEm.value = headlines.value.map((lines) => lines.map((line) => context.measureText(line.toUpperCase()).width / 100))

  const isMobile = window.innerWidth <= 1150
  const widestEm = Math.max(0, ...lineWidthsEm.value.flat())
  const splashHeight = splashEl.value.getBoundingClientRect().height
  // On a short window, also what's left once the subtitle and the room for the
  // top tab and the button are taken, so nothing runs into them.
  const subtitleHeight = splashEl.value.querySelector<HTMLElement>('.splash-subtitle')?.offsetHeight ?? 0
  const maxHeight = Math.min(splashHeight * (isMobile ? HEADLINE_MAX_HEIGHT_MOBILE : HEADLINE_MAX_HEIGHT), splashHeight - subtitleHeight - HEADLINE_CLEARANCE * 2)
  headlineMaxWidth.value = window.innerWidth * (1 - HEADLINE_SIDE_MARGIN * 2)
  // Mobile: the frame stays on screen (buildSentenceMasks), so the letters leave it
  // that margin plus the frame's largest step, which it snaps out to around them.
  if (stripTop.value) {
    const largestStep = Math.max(8, MASK_SNAP * HEADLINE_MAX_FONT_SIZE_MOBILE * window.innerWidth / HEADLINE_MAX_FONT_SIZE)
    headlineMaxWidth.value = window.innerWidth * (1 - FRAME_SCREEN_MARGIN * 2) - largestStep * 2
  }
  // Mobile: the text stands on the image strip, so it also has to fit between the
  // strip and the top tab, its frame's tallest step included.
  const roomAboveStrip = stripTop.value - stripGap * 2 - subtitleHeight - (tabTop.value + tabHeight.value + stripGap)
  headlineFontSize.value = Math.min(
    isMobile ? window.innerWidth * HEADLINE_MAX_FONT_SIZE_MOBILE : HEADLINE_MAX_FONT_SIZE,
    widestEm ? headlineMaxWidth.value / widestEm : Infinity,
    maxHeight / (headlineMaxLines.value * HEADLINE_LINE_HEIGHT),
    stripTop.value ? Math.max(0, roomAboveStrip) / (headlineMaxLines.value * HEADLINE_LINE_HEIGHT + EXTEND_MAX / HEADLINE_MAX_FONT_SIZE) : Infinity,
  )
}

const paragraphMask = ref<ParagraphMask>({ base: [], bites: [] })
// Which silhouette the mask draws — each headline settles on its own.
const maskSeed = ref(MASK_SEED)
let frameShuffle: FrameShuffle | null = null
const frameGrid = () => Math.max(8, Math.round(MASK_SNAP * headlineFontSize.value / HEADLINE_MAX_FONT_SIZE))
// The subtitle's box, a whole number of the frame's steps wide and centered, so
// each of its sides is on the frame's grid.
// Mobile: it also stays at least two steps inside the grid's sides, its text
// shrinking only as far as it takes to wrap no more than it does at the grid's
// full width (and a fifth at most).
function fitSubtitleBox() {
  const box = splashEl.value?.querySelector<HTMLElement>('.splash-subtitle-box')
  if (!box) return
  box.style.width = ''
  box.style.fontSize = ''
  const step = frameGrid()
  let limit = Infinity
  if (stripTop.value && grid.value) {
    const gridWidth = grid.value.right - grid.value.left
    limit = Math.floor((gridWidth - step * 4) / (step * 2)) * step * 2
    // Hugging the lines as they wrap: a wrapped box otherwise stays as wide as
    // its limit, however short its lines end up.
    box.style.width = `${limit}px`
    const range = document.createRange()
    range.selectNodeContents(box)
    const lines = [...range.getClientRects()]
    const { paddingLeft, paddingRight } = getComputedStyle(box)
    box.style.width = `${Math.ceil(Math.max(...lines.map((line) => line.right)) - Math.min(...lines.map((line) => line.left)) + parseFloat(paddingLeft) + parseFloat(paddingRight))}px`
  }
  box.style.width = `${Math.min(limit, Math.ceil(box.offsetWidth / (step * 2)) * step * 2)}px`
}
function buildSentenceMasks() {
  const masked = maskedEl.value
  // Leaving: the frame is closing (closeFrame), whatever the letters do.
  if (!masked || leaving.value) return
  // Mask coordinates start at .sentence-masked's own corner. A line can be
  // empty for a moment while a headline with more lines deciphers in.
  const origin = masked.getBoundingClientRect()
  const lines: LineBox[] = sentenceRefs.value
    .slice(0, headlineWords.value.length)
    .map((el) => el?.getBoundingClientRect())
    .filter((rect): rect is DOMRect => !!rect?.width)
    .map((rect) => ({ left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height }))
  if (!lines.length) return
  // While a headline changes, the frame is drawn for the lines as they'll end up,
  // so its pieces can land one by one, and the scrambled letters' changing widths
  // only ever add their own backing, for none of them to be cut off.
  const shape: LineBox[] = frameShuffle
    ? frameShuffle.targets.map((rect) => ({ left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height }))
    : lines
  const mask = buildParagraphMask(shape, headlineFontSize.value / HEADLINE_MAX_FONT_SIZE, maskSeed.value, frameShuffle)
  if (frameShuffle) mask.base.push(...lines)
  // Every edge on a coarse grid of screen pixels. Edges that nearly line up then
  // line up exactly, so the silhouette only has real steps, never a tiny jog, and
  // two pieces meeting leave no half-transparent seam for the outline to show
  // through. The backing snaps outward, so it always covers the letters; a bite's
  // inner edge snaps back towards the outside, so it never cuts deeper. The grid
  // starts from the subtitle's box, sized to it too (fitSubtitleBox), so the frame
  // meets that box on the same lines.
  const grid = frameGrid()
  const box = splashEl.value?.querySelector('.splash-subtitle-box')?.getBoundingClientRect()
  const startX = box?.width ? Math.round((box.left + box.right) / 2) : 0
  const startY = box?.width ? Math.round(box.top) : 0
  const downX = (value: number) => startX + Math.floor((value - startX) / grid) * grid
  const upX = (value: number) => startX + Math.ceil((value - startX) / grid) * grid
  const nearX = (value: number) => startX + Math.round((value - startX) / grid) * grid
  const downY = (value: number) => startY + Math.floor((value - startY) / grid) * grid
  const upY = (value: number) => startY + Math.ceil((value - startY) / grid) * grid
  // Mobile: no piece of the frame past these, on the same grid.
  const screenEdge = window.innerWidth * FRAME_SCREEN_MARGIN
  const minX = stripTop.value ? upX(screenEdge) : -Infinity
  const maxX = stripTop.value ? downX(window.innerWidth - screenEdge) : Infinity
  // Mobile: the frame stops at least a step short of the subtitle's box, whichever
  // silhouette it's jumping through, the box having its own margin above it.
  const maxY = stripTop.value && box?.width ? startY - Math.min(grid, stripGap) : Infinity
  const outward = (rect: MaskRect): MaskRect => {
    const left = Math.max(minX, downX(origin.left + rect.left))
    const right = Math.min(maxX, upX(origin.left + rect.left + rect.width))
    const top = downY(origin.top + rect.top)
    return {
      left: left - origin.left,
      top: top - origin.top,
      width: Math.max(0, right - left),
      height: Math.max(0, Math.min(maxY, upY(origin.top + rect.top + rect.height)) - top),
    }
  }
  const lineTop = lines[0]!.top
  const bite = (rect: MaskRect): MaskRect => {
    const left = nearX(origin.left + rect.left)
    const right = nearX(origin.left + rect.left + rect.width)
    // From the outside in: past the edge of the backing, to the snapped depth.
    const fromTop = rect.top <= lineTop + 1 || rect.top < lines[lines.length - 1]!.top
    const top = fromTop ? origin.top + rect.top - 80 : upY(origin.top + rect.top)
    const bottom = fromTop ? downY(origin.top + rect.top + rect.height) : origin.top + rect.top + rect.height + 80
    return { left: left - origin.left, top: top - origin.top, width: right - left, height: Math.max(0, bottom - top) }
  }
  maskLines = lines
  const base = mask.base.map(outward)
  // The frame always runs on into the subtitle's box, so nothing shows between
  // them, however short the headline. Not on mobile, where they stand apart.
  if (box?.width && !stripTop.value) {
    const last = shape[shape.length - 1]!
    const left = Math.max(origin.left + last.left, box.left)
    const right = Math.min(origin.left + last.left + last.width, box.right)
    if (right > left) {
      base.push(outward({
        left: left - origin.left,
        top: last.top + last.height - 1,
        width: right - left,
        height: box.top + grid - origin.top - (last.top + last.height - 1),
      }))
    }
  }
  paragraphMask.value = { base, bites: mask.bites.map(bite) }
}

// Leaving: the frame closes onto each line's own centre line, slow then fast, the
// way the images in the band do (.is-leaving .splash-image-wrapper). The outline
// follows it, since it's drawn off the same shape.
const FRAME_OUT_MS = 1100
let maskLines: LineBox[] = []
function closeFrame() {
  const start = paragraphMask.value
  const centers = maskLines.map((line) => line.top + line.height / 2)
  const nearest = (rect: MaskRect) => {
    const middle = rect.top + rect.height / 2
    return centers.reduce((best, center) => (Math.abs(center - middle) < Math.abs(best - middle) ? center : best), centers[0] ?? middle)
  }
  const close = (rect: MaskRect, keep: number) => {
    const center = nearest(rect)
    return { ...rect, top: center + (rect.top - center) * keep, height: rect.height * keep }
  }
  const began = performance.now()
  const step = () => {
    const t = Math.min(1, (performance.now() - began) / FRAME_OUT_MS)
    const keep = 1 - t * t * t
    paragraphMask.value = { base: start.base.map((rect) => close(rect, keep)), bites: start.bites.map((rect) => close(rect, keep)) }
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// Rebuilt whenever a line changes width — as its letters decipher, or the
// font arrives — before that frame paints: text outside the mask is
// invisible, so a mask a frame late cuts letters off.
let lineObserver: ResizeObserver | undefined
function observeLines() {
  lineObserver?.disconnect()
  lineObserver = new ResizeObserver(buildSentenceMasks)
  for (const el of sentenceRefs.value.slice(0, headlineWords.value.length)) {
    if (el) lineObserver.observe(el)
  }
}

// The "bank" — DECODE.cms/content/wiki, a media library page, not any one
// article's own images. `.filterBy('type', 'image')` excludes the one PDF
// in there; `.limit(10)` is the top of the "7 to 10" range asked for.
const { data: images } = await useAsyncData('splash:bank-images', () =>
  useKqlCollection<BankImage>({
    query: "page('wiki').files.filterBy('type', 'image').limit(10)",
    select: { url: "file.thumb('web-splash').url", alt: true },
  }),
)

// Doubled so the track can loop seamlessly: animating from translateX(0)
// to translateX(-50%) ends exactly where the first copy started.
const scrollingImages = computed(() => [...(images.value ?? []), ...(images.value ?? [])])

// The splash's images (only these: not the tool cards' and the rest of the
// site's): each one's duotone fitted to its own tones, so a mostly dark
// photo doesn't turn mostly near-white in the negative. Its tones are measured
// (through /api/cms-media: the CMS sends no CORS headers), then its darkest and
// brightest (2nd and 98th percentiles) stretched across the whole silver band
// (light: #f4f4f2 to #9fa1a3, dark: #e9e9e7 to #1c1c1c, as app.vue's
// #duotone-silver and #duotone-dark), its median landing in the middle of it.
// /?tone=off: the site's plain duotone instead, to compare.
const TONE_AUTO = useRoute().query.tone !== 'off'
watch(() => images.value?.length, () => toneImages())
const toneTables = ref<Record<string, { light: string[], dark: string[] }>>({})
const toneId = (url: string) => `splash-tone-${Math.abs([...url].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}`
async function toneImages() {
  if (!TONE_AUTO) return
  for (const image of images.value ?? []) {
    if (toneTables.value[image.url]) continue
    try {
      const blob = await (await fetch(`/api/cms-media?src=${encodeURIComponent(image.url)}`)).blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = Math.max(1, Math.round(160 * bitmap.height / bitmap.width))
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const levels: number[] = []
      for (let i = 0; i < d.length; i += 4) levels.push((0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!) / 255)
      levels.sort((a, b) => a - b)
      const at = (share: number) => levels[Math.floor(share * (levels.length - 1))]!
      const lo = at(0.02)
      const hi = Math.max(lo + 0.05, at(0.98))
      const mid = Math.min(0.9, Math.max(0.1, (at(0.5) - lo) / (hi - lo)))
      const gamma = Math.min(2.5, Math.max(0.4, Math.log(0.5) / Math.log(mid)))
      const band = (from: number[], to: number[]) => [0, 1, 2].map((ch) => Array.from({ length: 33 }, (_, k) => {
        const t = Math.min(1, Math.max(0, (k / 32 - lo) / (hi - lo))) ** gamma
        return ((from[ch]! + (to[ch]! - from[ch]!) * t) / 255).toFixed(4)
      }).join(' '))
      toneTables.value = {
        ...toneTables.value,
        [image.url]: { light: band([244, 244, 242], [159, 161, 163]), dark: band([233, 233, 231], [28, 28, 28]) },
      }
    }
    catch {
      // Left in the site's own duotone.
    }
  }
}

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
// The shelf layout's band height: keep in sync with .splash.is-shelf .splash-images.
const SHELF_BAND_VH = 34
const HEIGHT_VARIANTS = [1, 0.45, 0.8, 0.35, 0.95, 0.55, 0.7, 0.4]
function imageVariant(index: number) {
  const n = images.value?.length || 1
  return HEIGHT_VARIANTS[(index % n) % HEIGHT_VARIANTS.length] ?? 1
}
function imageHeight(index: number) {
  const variant = imageVariant(index)
  // imagesBandHeight starts at 0 until computeGrid's first measurement on
  // mount — the CSS band height (44vh) until then, which server and browser
  // agree on, unlike anything read off the window.
  return imagesBandHeight.value ? `${variant * imagesBandHeight.value}px` : `${variant * (shelfLayout ? SHELF_BAND_VH : 44)}vh`
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
    select: { title: true, id: true },
  }),
)

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
    },
  }),
)
const subtitleLines = computed(() => (info.value?.header_subtitle ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
// `long_description` used to render here too, right under `header_subtitle`
// — nearly the same sentence twice. Dropped so there's one paragraph, not
// two near-duplicates.

// Cell size is recalculated (not a fixed 80px) so the grid — confined to
// the splash section's own size minus the (now homogeneous — see
// computeGrid's `margin`) margin on every side — divides into whole
// cells: a fixed 80px would leave a clipped partial cell at the far edge,
// cutting off its outline. Width and height are fit independently (cells
// can end up slightly rectangular rather than perfectly square) so each
// axis gets a whole number of cells with no leftover.
//
// The grid's settings, all here:
// - SQUARE_TARGET: a cell's size, roughly (px): smaller, more cells.
// - GRID_FRAME_GAP: the gap between the grid and the frame drawn around it (px).
// - GRID_NUMBERS: the numbers in the left margin, shown or not, every
//   GRID_NUMBER_EVERY lines.
// - GRID_TICKS_ACROSS / GRID_TICKS_SIDE: how many little bars across the frame
//   on its top and bottom, and on its left and right, each on the nearest grid
//   line, GRID_TICK_LENGTH × GRID_TICK_WIDTH (px). GRID_TICK_SIDE_INSET: how far
//   in from the frame's corners the side ones start (of its height): smaller,
//   further apart.
// - The button sits halfway between the subtitle and the grid's bottom line on
//   desktop (placeCta), on that line on mobile.
// - The pixel masses are cut from these same squares and their quarters
//   (SHAPE_EDGE_QUARTERS, buildShapes).
// Its colours are CSS variables on .splash (--grid-line, --grid-frame, and the
// bars' --grid-tick).
// The original grid: big squares, no frame, no bars (GRID_FRAME). The masses
// keep their cells' size: each square split GRID_SPLIT times each way.
// /?grid=120 (or any size, px): bigger squares, to compare; mobile in proportion.
const GRID_PARAM = Number(useRoute().query.grid) || 0
const SQUARE_TARGET = GRID_PARAM || 80
const SQUARE_TARGET_MOBILE = Math.round(SQUARE_TARGET * 0.55)
const GRID_SPLIT = Math.max(2, 2 * Math.round(SQUARE_TARGET / 40))
const GRID_FRAME = false
const GRID_FRAME_GAP = 14
const GRID_FRAME_GAP_MOBILE = 8
const GRID_NUMBERS = false
const GRID_NUMBER_EVERY = 4
const GRID_TICKS_ACROSS = 3
const GRID_TICKS_SIDE = 2
const GRID_TICK_SIDE_INSET = 0.14
const GRID_TICK_LENGTH = 22
const GRID_TICK_WIDTH = 5

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
// The frame around the grid, GRID_FRAME_GAP outside it (computeGrid).
const frameStyle = ref<Record<string, string>>({})
// The same grid in plain numbers (px, relative to .splash) — the exit
// transition (leave(), below) redraws it as individual SVG lines so each
// one can retract on its own.
const grid = ref<{ top: number, left: number, right: number, bottom: number, cols: number, rows: number, cellW: number, cellH: number, boxW: number, boxH: number } | null>(null)
// The CTA's own center lands exactly on the grid's bottom line, so it
// needs the same margin the grid uses — kept separate from gridStyle
// since it's consumed by a different element.
const ctaStyle = ref<Record<string, string>>({})
// .splash-images' own rendered height, in px — see imageHeight() above for
// why this drives the per-image max-height instead of a CSS percentage.
const imagesBandHeight = ref(0)
// Mobile (not the shelf layout): the image strip is centered in the grid's lower
// half, with the headline and subtitle standing above it, one grid margin clear.
// stripTop is 0 on desktop, where the headline sits over the band instead.
const STRIP_MAX_HEIGHT = 0.28 // of the window's height
const stripTop = ref(0)
const stripStyle = ref<Record<string, string>>({})
let stripTallest = 0 // px, the tallest image as last measured (placeStrip)
let stripMinHeight = 0 // px, the least placeStrip brings the strip down to
let stripFullHeight = 0 // px, what it starts from
const STRIP_IMAGE_MAX_WIDTH = 0.6 // of the window's width: keep in sync with --splash-image-max-width
const STRIP_GAP_MAX = 0.025 // of the window's height
let stripGap = 0 // px, above the strip and between the headline and the subtitle
const infoStyle = ref<Record<string, string>>({})

function computeGrid() {
  if (!splashEl.value) return

  // Measured off the section itself, not window.innerHeight — `.splash`'s
  // height is `100vh - var(--footer-height)`, not the full viewport.
  const { width: boxW, height: boxH } = splashEl.value.getBoundingClientRect()
  const isMobile = window.innerWidth <= 1150

  // The tab's own sizing is specified against the *viewport*, not the
  // splash box (which is already a few vh short, for the footer) — and
  // since .splash starts at the very top of the page, a top-of-viewport
  // offset is also a top-of-splash offset.
  // Mobile: half the width (the ticker inside needs the room), the same
  // as SiteNav's own mobile MENU tab.
  tabWidth.value = window.innerWidth * (isMobile ? 0.5 : 0.25)
  tabHeight.value = window.innerHeight * 0.035
  tabTop.value = window.innerHeight * 0.015
  pageWidth.value = window.innerWidth

  // One margin value, identical on all four sides of the grid: left,
  // right, bottom (the gap above the footer), and — tying it to the tab —
  // the *gap between the tab's own bottom edge and the grid's top line*,
  // not the tab's whole footprint.
  // Mobile: off the width instead — 7.5% of a tall phone's height would
  // eat a large share of its narrow width on each side.
  const margin = isMobile ? window.innerWidth * 0.05 : window.innerHeight * 0.075
  const fullTop = tabTop.value + tabHeight.value + margin
  const usableW = boxW - margin * 2
  const fullH = boxH - fullTop - margin
  // Mobile: 20% shorter than the space allows, centered in it — the full
  // height reads too tall and narrow on a phone.
  const usableH = isMobile ? fullH * 0.8 : fullH
  const gridTop = fullTop + (fullH - usableH) / 2
  const gridBottomGap = boxH - gridTop - usableH

  const square = isMobile ? SQUARE_TARGET_MOBILE : SQUARE_TARGET
  const cols = Math.max(1, Math.round(usableW / square))
  const rows = Math.max(1, Math.round(usableH / square))
  const cellWidth = usableW / cols
  const cellHeight = usableH / rows

  gridStyle.value = {
    top: `${gridTop}px`,
    bottom: `${gridBottomGap}px`,
    left: `${margin}px`,
    right: `${margin}px`,
    backgroundSize: `${cellWidth}px ${cellHeight}px`,
  }

  const frameGap = isMobile ? GRID_FRAME_GAP_MOBILE : GRID_FRAME_GAP
  frameStyle.value = {
    top: `${gridTop - frameGap}px`,
    bottom: `${gridBottomGap - frameGap}px`,
    left: `${margin - frameGap}px`,
    right: `${margin - frameGap}px`,
  }

  ctaStyle.value = { top: `${boxH - gridBottomGap}px` }
  grid.value = { top: gridTop, left: margin, right: boxW - margin, bottom: boxH - gridBottomGap, cols, rows, cellW: cellWidth, cellH: cellHeight, boxW, boxH }

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
    // Corner 1 sits further in (lower, more to the right) than the
    // others — tucked right into the corner it read as cramped.
    { ...common, top: `${insetYTop + 30}px`, left: `${insetX + 40}px` },
    { ...common, top: `${insetYTop + 14}px`, right: `${insetX + 10}px` },
    { ...common, bottom: `${insetYBottom + 6}px`, left: `${insetX + 14}px` },
    { ...common, bottom: `${insetYBottom + 18}px`, right: `${insetX}px` },
  ]

  if (isMobile && !shelfLayout) {
    // Keeps a margin from the button, which is centered on the grid's bottom line.
    const halfGrid = usableH / 2
    const ctaHeight = splashEl.value.querySelector<HTMLElement>('.splash-cta')?.offsetHeight ?? 0
    // The text stands above what's kept for the strip; the images themselves start at
    // their full size, and placeStrip brings them down only as far as they have to.
    stripMinHeight = halfGrid * 0.5
    const stripRoom = Math.max(stripMinHeight, Math.min(window.innerHeight * STRIP_MAX_HEIGHT, halfGrid - ctaHeight - margin * 2))
    const stripHeight = Math.max(stripRoom, window.innerHeight * STRIP_MAX_HEIGHT)
    const stripCenter = gridTop + halfGrid * 1.5
    stripTop.value = stripCenter - stripRoom / 2
    stripFullHeight = stripHeight
    imagesBandHeight.value = stripHeight
    stripStyle.value = { top: `${stripCenter}px`, height: `${stripHeight}px` }
    // The grid's margin, unless the window is so short that it would squeeze the text.
    stripGap = Math.min(margin, window.innerHeight * STRIP_GAP_MAX)
    infoStyle.value = { justifyContent: 'flex-end', paddingBottom: `${boxH - stripTop.value + stripGap}px`, '--subtitle-gap': `${stripGap}px` }
    return
  }

  stripTop.value = 0
  stripStyle.value = {}
  infoStyle.value = {}
  if (imagesEl.value) {
    imagesBandHeight.value = imagesEl.value.getBoundingClientRect().height
  }
}

// Exit transition into the home screen (~1.9s, then `continue`; the
// home side's own draw-in is useIntroTransition + SiteNav/SiteIndexBar/
// KeywordsPanel). Every text block scrambles its letters while they
// vanish one by one in place (scrambleOut), their white/colored boxes
// fading at the very end; images are masked away onto their centre line
// and the pixel masses fade away.
// The grid goes first: every line,
// vertical and horizontal, retracts into its own centre at once, slow
// then fast, fading out before it finishes — gone before the text and
// images are.
// (The middle line reappears on the home side — app.vue's
// .intro-keep-line.)
// Text is gone by ~1.3s and lines/images by ~1.4s; the rest is a short
// hold on the emptied screen before the home side starts drawing.
const OUTRO_MS = 1900

// Arrival (useSplashIntro), desktop and mobile alike (reduced motion goes
// straight to 'done'):
//  1. A white screen; DE.CO.DE grows in black in the middle from nothing,
//     then the subtitle deciphers in just under it, inverted (white on a
//     black box). Both held for 2s.
//  2. The logo scrambles away letter by letter (OUT_MS); once it's gone,
//     the subtitle glides down to its own spot (MOVE_MS).
//  3. There its colors snap to their final black-on-white, and the splash
//     builds itself (BUILD_AT): grid lines grow out of their centres,
//     images unmask from their centre line, pixel masses fade in, the
//     corner titles/badges, CTA and image labels decipher.
//  4. The headline arrives last (HEADLINE_AT), deciphering from a couple
//     of letters per word, its white backing mask re-measured as it grows.
//  5. The top tab and its baseline trace themselves (TAB_AT), then the
//     footer slides up into view (FOOTER_AT).
const splashIntro = useSplashIntro()
const introSeen = useIntroSeen()
// Returning visitor (useSplashIntro): no intro. The layout is measured on
// mount, so the splash stays hidden until then and fades in, around half a
// second instead of about ten.
const returning = splashIntro.value === 'done'
const measured = ref(false)
const logoVisible = ref(splashIntro.value === 'logo')
const subtitleShown = ref(false)
const subtitleMoving = ref(false)
const headlineShown = ref(false)
// How far up the subtitle sits (px) while it's next to the logo.
const subtitleLift = ref(0)
function measureSubtitleLift() {
  const logo = splashEl.value?.querySelector('.splash-logo .decipher-text')?.getBoundingClientRect()
  const subtitle = splashEl.value?.querySelector('.splash-subtitle')?.getBoundingClientRect()
  if (logo && subtitle) subtitleLift.value = Math.round(logo.bottom + 10 - subtitle.top)
}
const LOGO_START_MS = 300
const SUBTITLE_AT = 1500
// Subtitle deciphered by ~2.7s, then both held 2s.
const OUT_AT = 4700
const OUT_MS = 900
const MOVE_AT = OUT_AT + OUT_MS
const MOVE_MS = 900
const BUILD_AT = MOVE_AT + MOVE_MS
const HEADLINE_AT = BUILD_AT + 900
const TAB_AT = HEADLINE_AT + 1250
const FOOTER_AT = TAB_AT + 900
const DONE_AT = FOOTER_AT + 700
const introTimers: ReturnType<typeof setTimeout>[] = []
const introClass = computed(() => (['logo', 'build', 'tab', 'footer'].includes(splashIntro.value) ? `intro-${splashIntro.value}` : null))

function buildIn() {
  splashIntro.value = 'build'
  logoVisible.value = false
  constructShapes()
  for (const el of splashEl.value?.querySelectorAll<HTMLElement>('.corner-title, .corner-badge, .splash-cta, .image-label') ?? []) {
    decipherIn(el)
  }
}

// The headline's white backing is a CSS mask cut from each line's own
// measured width, following its words as they grow (observeLines). No
// opacity fade-in (`reveal: false`): an animated element inside the masked
// block makes Chrome stop applying the mask.
function headlineIn() {
  headlineShown.value = true
  for (const el of splashEl.value?.querySelectorAll<HTMLElement>('.sentence-text') ?? []) {
    decipherIn(el, { growMax: 2, reveal: false })
  }
  buildSentenceMasks()
}

// The pixel masses behind the headline, one per chapter (in its badge color), on
// a grid across the whole splash. They never move as a whole: at each headline
// change, in step with its letters, each morphs cell by cell into a new mass. Each
// keeps to its own corner of the grid, above or below the image band so it isn't
// hidden by it, and they share no corner, so they spread out and never overlap.
// There's one more corner than masses: every few changes, one of them travels to
// it, usually from the corner nearest it. The rest of the time they stay put and
// each new mass is close to the last in place and size, so nothing jumps far.
// The masses are drawn on the splash grid itself: each of its squares split in
// four (a quarter is the masses' cell), whole squares inside, quarters along the
// edges (refineMass, SHAPE_EDGE_QUARTERS of them changed).
const SHAPE_EDGE_QUARTERS = 0.3
// The unit the tucks, lifts and sizes below are counted in, of the window's height
// (not the grid's quarters, which follow SQUARE_TARGET).
const SHAPE_FULL_CELL = 0.016
const SHAPE_FULL_CELL_MOBILE = 0.0085
const SHAPE_GRID_PAD = 3 // cells past the screen's sides and bottom, so no outline shows on its edge
const SHAPE_EDGE_MARGIN = 30 // px clear under the top tab's line, and above the footer
const SHAPE_GRID_OVERHANG = 2 // mobile: cells a top mass may reach past the grid's side
const SHAPE_TOP_LIFT = 6 // mobile: cells a top mass rises above the grid
const SHAPE_TOP_WIDTH = 0.24 // mobile: a top mass's width at most, of the screen's
const SHAPE_TOP_RATIO = 1.6 // mobile: a top mass's height at most, as a multiple of its width
const SHAPE_TOP_SCALE = 0.6 // desktop: a top mass's area, of the corner's
const SHAPE_TOP_TUCK = 3 // desktop: cells a top mass reaches behind the headline
const SHAPE_TOP_RIGHT_RISE = 0.5 // desktop: how much of the right top mass stands above the headline's top (the left one: all of it)
const SHAPE_CROSS_COLS = 22 // the crossing mass's size in cells, its outer ones mostly empty
const SHAPE_CROSS_ROWS = 8
const SHAPE_CROSS_HOP = 6 // cells further right each new form of the crossing mass lands
const SHAPE_CROSS_MS = 7000 // how long it takes to turn into that next form
const SHAPE_CROSS_STEPS = 28
let crossLeft = 0 // cells from the screen's left edge
let crossActive = false
let crossTimer: ReturnType<typeof setTimeout> | undefined
// How each theme behaves. Light keeps attention on the headline: bigger masses
// that barely change, one at a time and slowly, each new one the last with its
// noise shifted a little (evolve). Dark is livelier: all three at once, in step
// with the letters, new masses each time, smaller so the videos read as windows.
const SHAPE_MOTION = {
  light: { bandTuck: 7, titleTuck: 9, sizeMin: 0.8, drift: 0.06, travelEvery: 12, travelNearest: 1, morphMs: 5000, steps: 25, oneAtATime: true, evolve: 0.4, holdMs: 6000 },
  dark: { bandTuck: 3, titleTuck: 4, sizeMin: 0.55, drift: 0.25, travelEvery: 3, travelNearest: 0.75, morphMs: 1400, steps: 18, oneAtATime: false, evolve: 0, holdMs: 4000 },
}
// Dark mode: what fills each mass, through the duotone (.splash-shape-video).
const SHAPE_VIDEOS = ['/videos/splash-1.mp4', '/videos/splash-2.mp4', '/videos/splash-3.mp4']
const SHAPE_CORNERS = [
  { right: false, bottom: false },
  { right: true, bottom: false },
  { right: true, bottom: true },
  { right: false, bottom: true },
]
interface ShapeState {
  corner: number
  seed: number | null // null: the drawn silhouette
  width: number // shares of the corner's area, then of what's left of it
  height: number
  slackX: number
  slackY: number
  phase: number // how far its noise has shifted (light mode's evolve)
}
const shapeStates: ShapeState[] = [
  { corner: 2, seed: 73, width: 0.8, height: 0.9, slackX: 0.3, slackY: 0.2, phase: 0 },
  { corner: 0, seed: null, width: 0.95, height: 1, slackX: 0, slackY: 0, phase: 0 },
  { corner: 1, seed: 41, width: 0.75, height: 0.85, slackX: 0.2, slackY: 0.4, phase: 0 },
]
// cw × ch: a quarter of a grid square (px). x0, y0: where cell 0 0 sits on the
// splash, on a grid line, past its left and top edges. pad: cell columns left of
// the screen. unit: SHAPE_FULL_CELL in px.
const shapeGrid = ref({ cw: 0, ch: 0, x0: 0, y0: 0, cols: 0, rows: 0, pad: 0, unit: 0 })
// From the splash's px to its cells, and the crossing mass's size in cells (even,
// so it covers whole squares).
const shapeCol = (px: number) => (px - shapeGrid.value.x0) / shapeGrid.value.cw
const shapeRow = (py: number) => (py - shapeGrid.value.y0) / shapeGrid.value.ch
const toEven = (n: number) => Math.max(2, Math.round(n / 2) * 2)
const crossCols = () => toEven(SHAPE_CROSS_COLS * shapeGrid.value.unit / shapeGrid.value.cw)
const crossRows = () => toEven(SHAPE_CROSS_ROWS * shapeGrid.value.unit / shapeGrid.value.ch)
const shapeViews = ref<{ fill: string, outline: string, video: Record<string, string> }[]>([])
let shapeCells: Set<number>[] = []
let shapeRound = 0
let shapeTimer: ReturnType<typeof setTimeout> | undefined

const shapeMotion = () => SHAPE_MOTION[colorMode.value === 'dark' ? 'dark' : 'light']
const shapeDrift = (share: number, min: number) => Math.min(1, Math.max(min, share + (Math.random() * 2 - 1) * shapeMotion().drift))

function shapeFirstRow() {
  return Math.ceil(shapeRow(tabTop.value + tabHeight.value + SHAPE_EDGE_MARGIN))
}

// A corner's area in cells: between the top tab or the screen's bottom and the
// image band, and between the screen's side and the headline.
function shapeArea(corner: number) {
  const { unit: cell, cw, ch, pad } = shapeGrid.value
  const splash = splashEl.value!
  const origin = splash.getBoundingClientRect()
  const band = imagesEl.value?.getBoundingClientRect()
  const bandTop = band ? band.top - origin.top : origin.height * 0.28
  const bandBottom = band ? band.bottom - origin.top : origin.height * 0.72
  const halfTitle = Math.max(0, ...lineWidthsEm.value.flat()) * headlineFontSize.value / 2
  const halfScreen = origin.width / 2
  const width = Math.max(origin.width * 0.3, Math.min(halfScreen - 2 * cell, halfScreen - halfTitle + shapeMotion().titleTuck * cell))
  const { right, bottom } = SHAPE_CORNERS[corner]!
  const top = bottom ? bandBottom - shapeMotion().bandTuck * cell : (tabTop.value + tabHeight.value + SHAPE_EDGE_MARGIN)
  const end = bottom ? origin.height - SHAPE_EDGE_MARGIN : bandTop + shapeMotion().bandTuck * cell
  if (stripTop.value && grid.value) {
    // Mobile: the bottom mass is a small one, level with the top of the tallest image
    // and behind it, wherever it has shape-shifted to so far (crossHop).
    const imageTop = bandBottom - (stripTallest || imagesBandHeight.value)
    const crossTop = Math.round(shapeRow(imageTop) - crossRows() / 2)
    if (bottom) return { left: crossLeft + pad, top: crossTop, cols: crossCols(), rows: crossRows(), right, bottom }
    // The top masses are small and upright, at the grid's top corners, rising a little
    // above it, and stop short of the crossing mass's path.
    const overhang = SHAPE_GRID_OVERHANG * cell
    const areaTop = Math.ceil(shapeRow(grid.value.top - SHAPE_TOP_LIFT * cell))
    const cols = Math.floor(origin.width * SHAPE_TOP_WIDTH / cw)
    return {
      left: right ? Math.round(shapeCol(grid.value.right + overhang)) - cols : Math.round(shapeCol(grid.value.left - overhang)),
      top: areaTop,
      cols,
      rows: Math.min(Math.round(cols * cw / ch * SHAPE_TOP_RATIO), crossTop - areaTop),
      right,
      bottom,
    }
  }
  if (!shelfLayout) {
    // Desktop: the bottom mass crosses between the subtitle and the button.
    if (bottom) {
      const subtitle = splash.querySelector('.splash-subtitle-box')?.getBoundingClientRect()
      const cta = splash.querySelector('.splash-cta')?.getBoundingClientRect()
      const middle = subtitle && cta ? (subtitle.bottom + cta.top) / 2 - origin.top : bandBottom
      return { left: crossLeft + pad, top: Math.round(shapeRow(middle) - crossRows() / 2), cols: crossCols(), rows: crossRows(), right, bottom }
    }
    // The top ones are smaller, tucked behind the headline's upper corners along the
    // diagonal, the right one lower so the two don't line up. `right` flips: what
    // room is left over opens towards the screen's edge, the mass keeping to the title.
    const titleTop = (sentencesEl.value?.getBoundingClientRect().top ?? top) - origin.top
    const cols = Math.floor(width * SHAPE_TOP_SCALE / cw)
    const rows = Math.floor((end - top) * SHAPE_TOP_SCALE / ch)
    const tuck = SHAPE_TOP_TUCK * cell
    const titleEdge = right ? halfScreen + halfTitle - tuck : halfScreen - halfTitle + tuck - cols * cw
    const massTop = titleTop + tuck - rows * ch * (right ? SHAPE_TOP_RIGHT_RISE : 1)
    return {
      left: Math.round(shapeCol(Math.max(0, Math.min(origin.width - cols * cw, titleEdge)))),
      top: Math.max(Math.ceil(shapeRow(top)), Math.round(shapeRow(massTop))),
      cols,
      rows,
      right: !right,
      bottom,
    }
  }
  return {
    left: Math.round(shapeCol(right ? origin.width - width : 0)),
    top: Math.ceil(shapeRow(top)),
    cols: Math.floor(width / cw),
    rows: Math.floor(shapeRow(end)) - Math.ceil(shapeRow(top)),
    right,
    bottom,
  }
}

function shapeTarget(state: ShapeState) {
  const { cols, rows, pad, cw, ch } = shapeGrid.value
  const area = shapeArea(state.corner)
  // The crossing mass takes its whole area.
  const whole = !shelfLayout && area.bottom
  // In whole grid squares (two cells each way), starting on a grid line.
  const width = Math.max(6, toEven(whole ? area.cols : area.cols * state.width))
  const height = Math.max(6, toEven(whole ? area.rows : area.rows * state.height))
  const spareX = whole ? 0 : Math.round((area.cols - width) * state.slackX)
  const spareY = whole ? 0 : Math.round((area.rows - height) * state.slackY)
  // Towards the screen's corner, the slack opening towards the headline.
  const left = Math.round((area.right ? area.left + area.cols - width - spareX : area.left + spareX) / 2) * 2
  const top = Math.round((area.bottom ? area.top + area.rows - height - spareY : area.top + spareY) / 2) * 2
  const squares = state.seed === null ? resizeMass(SHAPE_DRAWN, width / 2, height / 2) : generateMass(state.seed, width / 2, height / 2, state.phase)
  const mass = refineMass(squares, (state.seed ?? 0) + Math.round(state.phase * 10), SHAPE_EDGE_QUARTERS)
  return {
    left,
    top,
    cells: stampMass(mass, left, top, cols, rows, shapeFirstRow()),
    video: {
      left: `${left * cw}px`,
      top: `${top * ch}px`,
      width: `${width * cw}px`,
      height: `${height * ch}px`,
    },
    pad,
  }
}

// Lays them out as they stand: on load, and whenever the window changes size.
function buildShapes() {
  clearTimeout(shapeTimer)
  const splash = splashEl.value
  if (!splash || !sentencesEl.value) return
  const { width, height } = splash.getBoundingClientRect()
  const g = grid.value
  if (!g) return
  const unit = Math.max(5, Math.round(window.innerHeight * (window.innerWidth <= 1150 ? SHAPE_FULL_CELL_MOBILE : SHAPE_FULL_CELL)))
  // The grid's squares split GRID_SPLIT times each way, laid from one of its
  // lines so that every GRID_SPLIT-th cell starts a square, carried on past the
  // screen's edges.
  const cw = g.cellW / GRID_SPLIT
  const ch = g.cellH / GRID_SPLIT
  const across = GRID_SPLIT * Math.ceil((g.left / cw + SHAPE_GRID_PAD) / GRID_SPLIT)
  const down = GRID_SPLIT * Math.ceil(g.top / ch / GRID_SPLIT)
  const x0 = g.left - across * cw
  const y0 = g.top - down * ch
  shapeGrid.value = { cw, ch, x0, y0, unit, pad: Math.round(-x0 / cw), cols: Math.ceil((width - x0) / cw) + SHAPE_GRID_PAD, rows: Math.ceil((height - y0) / ch) + SHAPE_GRID_PAD }
  clearPixels()
  clearScramble()
  const targets = shapeStates.map(shapeTarget)
  // First visit: nothing yet, until the splash builds itself (constructShapes).
  const waiting = splashIntro.value === 'logo'
  shapeCells = targets.map((target) => (waiting ? new Set<number>() : target.cells))
  shapeViews.value = targets.map((target, index) => ({ ...cellPaths(shapeCells[index]!), video: target.video }))
  if (crossActive) crossHop()
}

// The small mass behind the images never slides. It keeps turning, a cell at
// a time, into a new form a little further right: its back falling away first, its
// front growing last. Past the right edge, it comes back in from the left. On its
// own clock, not the headline's (morphShapes leaves it out).
function crossHop() {
  clearTimeout(crossTimer)
  const index = shapeStates.findIndex((state) => SHAPE_CORNERS[state.corner]!.bottom)
  const cells = shapeCells[index]
  if (shelfLayout || !cells) return
  const state = shapeStates[index]!
  crossLeft += toEven(SHAPE_CROSS_HOP * shapeGrid.value.unit / shapeGrid.value.cw)
  if (crossLeft >= shapeGrid.value.cols - shapeGrid.value.pad) crossLeft = -crossCols()
  crossLeft = Math.round(crossLeft / 2) * 2
  state.seed = Math.floor(Math.random() * 1e6)
  const target = shapeTarget(state)
  const steps = morphSteps(cells, target.cells, 1, 0, Math.floor(Math.random() * 1e6))
  let next = 0
  let step = 0
  const tick = () => {
    step++
    while (next < steps.length && (step === SHAPE_CROSS_STEPS || steps[next]!.time < step / SHAPE_CROSS_STEPS)) {
      const change = steps[next]!
      if (change.add) cells.add(change.key)
      else cells.delete(change.key)
      next++
    }
    shapeViews.value = shapeViews.value.map((view, i) => (i === index ? { ...cellPaths(cells), video: target.video } : view))
    crossTimer = setTimeout(step < SHAPE_CROSS_STEPS ? tick : crossHop, SHAPE_CROSS_MS / SHAPE_CROSS_STEPS)
  }
  tick()
}
function startCrossing() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  crossActive = true
  crossHop()
}

// The splash building itself: each mass grows cell by cell out of nothing, along
// with the images unmasking and the grid drawing.
const SHAPE_BUILD_MS = 1800
const SHAPE_BUILD_STEPS = 24
function runShapeSteps(plans: { steps: ReturnType<typeof morphSteps>, next: number }[], ms: number, count: number) {
  let step = 0
  const tick = () => {
    step++
    shapeViews.value = shapeViews.value.map((view, index) => {
      const plan = plans[index]!
      if (!plan.steps.length) return view
      const cells = shapeCells[index]!
      while (plan.next < plan.steps.length && (step === count || plan.steps[plan.next]!.time < step / count)) {
        const change = plan.steps[plan.next]!
        if (change.add) cells.add(change.key)
        else cells.delete(change.key)
        plan.next++
      }
      return { ...view, ...cellPaths(cells) }
    })
    if (step < count) shapeTimer = setTimeout(tick, ms / count)
  }
  tick()
}
function constructShapes() {
  clearTimeout(shapeTimer)
  if (!shapeCells.length) return
  const plans = shapeStates.map((state, index) => ({
    steps: morphSteps(shapeCells[index]!, shapeTarget(state).cells, 0, -1, 17 + index),
    next: 0,
  }))
  runShapeSteps(plans, SHAPE_BUILD_MS, SHAPE_BUILD_STEPS)
}

// Starts with the headline's letters. In dark mode all three change, over exactly
// the letters' time; in light mode only one, in turn, over most of the hold.
function morphShapes() {
  clearTimeout(shapeTimer)
  scrambleTargets = []
  if (!shapeCells.length) return
  const motion = shapeMotion()
  shapeRound++
  const free = SHAPE_CORNERS.findIndex((_, corner) => !shapeStates.some((state) => state.corner === corner))
  // Corners run round the screen, so the one up or down from the free one is
  // across the short side, and the diagonal is never used.
  const freeCorner = SHAPE_CORNERS[free]!
  const neighbor = (sameSide: boolean) => shapeStates.findIndex((state) => {
    const corner = SHAPE_CORNERS[state.corner]!
    return sameSide
      ? corner.right === freeCorner.right && corner.bottom !== freeCorner.bottom
      : corner.right !== freeCorner.right && corner.bottom === freeCorner.bottom
  })
  // None travels, each mass having its own place, except in the shelf layout.
  const traveler = shelfLayout && shapeRound % motion.travelEvery === 0 ? neighbor(Math.random() < motion.travelNearest) : -1
  const turn = traveler >= 0 ? traveler : shapeRound % shapeStates.length
  const plans = shapeStates.map((state, index) => {
    const crossing = !shelfLayout && SHAPE_CORNERS[state.corner]!.bottom
    if (crossing || (motion.oneAtATime && index !== turn)) return { steps: [] as ReturnType<typeof morphSteps>, next: 0, video: null }
    const before = shapeTarget(state)
    if (index === traveler) state.corner = free
    // The drawn silhouette has no noise to shift: its first change is a new mass.
    if (motion.evolve && index !== traveler && state.seed !== null) state.phase += motion.evolve
    else state.seed = Math.floor(Math.random() * 1e6)
    state.width = shapeDrift(state.width, motion.sizeMin)
    state.height = shapeDrift(state.height, motion.sizeMin)
    state.slackX = shapeDrift(state.slackX, 0)
    state.slackY = shapeDrift(state.slackY, 0)
    const after = shapeTarget(state)
    return {
      steps: morphSteps(shapeCells[index]!, after.cells, after.left - before.left, after.top - before.top, shapeRound * 31 + index),
      next: 0,
      video: after.video,
    }
  })
  shapeViews.value = shapeViews.value.map((view, index) => ({ ...view, video: plans[index]!.video ?? view.video }))
  runShapeSteps(plans, motion.morphMs, motion.steps)
}

// Light mode: while the headline deciphers, each mass fills up with pixels on the
// letters' own beats, sweeping from left to right as they land, then dissolves back
// to the bare outline once the headline has landed (/lab/pixels' "Video pixels"):
// - What they show: the mass's own video (the ones dark mode shows through them),
//   pixelated, each pixel the mean of the cells under it, in the splash's silver
//   (the site's negative, #duotone-silver), its contrast raised.
// - Their size: PIXEL_CELLS cells square (2: one grid square), split in four down
//   to a single cell (a quarter of a square) along the mass's outline and, at
//   random, PIXEL_DETAIL of the time inside it.
// - Their colour: each mass's own (its outline's), in patches over about
//   PIXEL_TINT_SHARE of them, tone on tone, and a few solid squares.
// - Each flickers on and off a moment before it settles, like the cells, and the
//   grid's squares show inside the mass while they're there.
const PIXEL_CELLS = 4
const PIXEL_DETAIL = 0.4
const PIXEL_CONTRAST = 1.6
const PIXEL_TINT_SHARE = 0.4
const PIXEL_TINT_SCALE = 4 // a patch of colour, in SHAPE_FULL_CELL units
const PIXEL_ACCENT_CHANCE = 0.04
const PIXEL_SWEEP = 0.65 // how strictly they build left to right (0: at random)
const PIXEL_FLICKER_MS = 500 // how long before settling a pixel starts flickering
const PIXEL_DISSOLVE_MS = 1300
const PIXEL_DISSOLVE_STEPS = 14
const PIXEL_SILVER = { light: [244, 244, 242], dark: [159, 161, 163] }
interface ShapePixel { x: number, y: number, size: number, t: number, at: number, on: boolean }
interface PixelPalette { rgb: number[], pale: number[], deep: number[] }
// Each mass's pixels, and the box they cover (in cells), drawn on its own canvas.
let shapePixels: ShapePixel[][] = []
const pixelBoxes = ref<({ x: number, y: number, w: number, h: number } | null)[]>([])
const pixelCanvases = ref<HTMLCanvasElement[]>([])
let pixelPalettes: PixelPalette[] = []
let pixelVideos: HTMLVideoElement[] = []
let pixelFrame = 0
let pixelRound = 0
let pixelTimers: ReturnType<typeof setTimeout>[] = []
// The cells each mass is turning into this round (scrambleShapes), for the pixels
// to cover both forms.
let scrambleTargets: (Set<number> | null)[] = []
const pixelScratch = import.meta.client ? document.createElement('canvas') : null

function loadPixelVideos() {
  if (pixelVideos.length || !import.meta.client) return
  pixelVideos = SHAPE_VIDEOS.map((src) => {
    const video = document.createElement('video')
    Object.assign(video, { src, muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' })
    video.play().catch(() => {})
    return video
  })
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const blendRgb = (a: number[], b: number[], t: number) => a.map((value, i) => value + (b[i]! - value) * t)
const rgbCss = (c: number[]) => `rgb(${c.map((value) => Math.round(value)).join(' ')})`
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

// Smooth noise over the splash (0 to 1, `scale` px across): where the colour gathers.
function tintField(seed: number, scale: number) {
  const rand = mulberry32(seed)
  const lattice = new Map<string, number>()
  const at = (x: number, y: number) => {
    const key = `${x},${y}`
    if (!lattice.has(key)) lattice.set(key, rand())
    return lattice.get(key)!
  }
  const smooth = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const gx = x / scale, gy = y / scale
    const x0 = Math.floor(gx), y0 = Math.floor(gy)
    const tx = smooth(gx - x0), ty = smooth(gy - y0)
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx
    return top + (bottom - top) * ty
  }
}

// Silver from the video's brightness, then pale, full and deep colour.
function pixelShade(palette: PixelPalette, level: number, t: number) {
  const silver = blendRgb(PIXEL_SILVER.light, PIXEL_SILVER.dark, clamp01(0.5 + (level - 0.5) * PIXEL_CONTRAST))
  if (t <= 0) return silver
  return t < 0.4
    ? blendRgb(silver, palette.pale, t / 0.4)
    : t < 0.75 ? blendRgb(palette.pale, palette.rgb, (t - 0.4) / 0.35) : blendRgb(palette.rgb, palette.deep, (t - 0.75) / 0.25)
}

function clearPixels() {
  pixelTimers.forEach(clearTimeout)
  pixelTimers = []
  cancelAnimationFrame(pixelFrame)
  pixelFrame = 0
  shapePixels = []
  pixelBoxes.value = []
}

// One mass's pixels, over both its forms (and, for the crossing mass, which keeps
// moving, a little around them): squares split in four where the outline crosses
// them, or at random.
function buildPixels(cells: Set<number>, loose: boolean, seed: number) {
  const { cw, x0, unit } = shapeGrid.value
  const rand = mulberry32(seed)
  const tint = tintField(seed + 5, PIXEL_TINT_SCALE * unit)
  const splashWidth = splashEl.value?.getBoundingClientRect().width ?? window.innerWidth
  const last = HEADLINE_MORPH_MS - HEADLINE_LETTER_GAP.last
  const cut = 1 - PIXEL_TINT_SHARE
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const key of cells) {
    const x = key % 4096, y = Math.floor(key / 4096)
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  const coverage = (x: number, y: number, size: number) => {
    let count = 0
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) if (cells.has((y + j) * 4096 + x + i)) count++
    return count / (size * size)
  }
  const pixels: ShapePixel[] = []
  const push = (x: number, y: number, size: number) => {
    const screenX = x0 + (x + size / 2) * cw
    const noise = tint(screenX, (y + size / 2) * shapeGrid.value.ch)
    let t = noise <= cut ? 0 : clamp01((noise - cut) / Math.max(0.05, 1 - cut) * 1.2)
    if (rand() < PIXEL_ACCENT_CHANCE) t = 0.75 + rand() * 0.25
    pixels.push({ x, y, size, t, at: last * clamp01((screenX / splashWidth) * PIXEL_SWEEP + rand() * (1 - PIXEL_SWEEP)), on: false })
  }
  const split = (x: number, y: number, size: number) => {
    const covered = coverage(x, y, size)
    if (covered === 0 && !loose) return
    if (size > 1 && ((covered > 0 && covered < 1) || rand() < PIXEL_DETAIL * 0.6)) {
      const half = size / 2
      for (const [dx, dy] of [[0, 0], [half, 0], [0, half], [half, half]]) split(x + dx!, y + dy!, half)
      return
    }
    push(x, y, size)
  }
  const size = PIXEL_CELLS
  const reach = loose ? 2 * size : 0
  for (let y = Math.floor(minY / size) * size; y <= maxY; y += size) {
    for (let x = Math.floor(minX / size) * size - reach; x <= maxX + reach; x += size) split(x, y, size)
  }
  return pixels
}

// Every frame while there are pixels: each mass's video, one sample per cell, each
// pixel the mean of its cells, clipped to the mass as it stands, the grid's
// squares over them.
function drawPixels() {
  const { cw, ch } = shapeGrid.value
  const dpr = window.devicePixelRatio || 1
  shapePixels.forEach((pixels, index) => {
    const canvas = pixelCanvases.value[index]
    const box = pixelBoxes.value[index]
    if (!canvas || !box) return
    const width = Math.round(box.w * cw * dpr)
    const height = Math.round(box.h * ch * dpr)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    const context = canvas.getContext('2d')!
    context.setTransform(dpr * cw, 0, 0, dpr * ch, -box.x * cw * dpr, -box.y * ch * dpr)
    context.clearRect(box.x, box.y, box.w, box.h)
    const on = pixels.filter((pixel) => pixel.on)
    const palette = pixelPalettes[index]
    if (!on.length || !palette) return
    const video = pixelVideos[index]
    let levels: Uint8ClampedArray | null = null
    if (pixelScratch && video && video.readyState >= 2 && video.videoWidth) {
      pixelScratch.width = box.w
      pixelScratch.height = box.h
      const scratch = pixelScratch.getContext('2d', { willReadFrequently: true })!
      const boxWidth = box.w * cw, boxHeight = box.h * ch
      const scale = Math.max(boxWidth / video.videoWidth, boxHeight / video.videoHeight)
      const sourceWidth = boxWidth / scale, sourceHeight = boxHeight / scale
      scratch.drawImage(video, (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, box.w, box.h)
      levels = scratch.getImageData(0, 0, box.w, box.h).data
    }
    const level = (pixel: ShapePixel) => {
      if (!levels) return 0.5
      let sum = 0
      for (let y = pixel.y - box.y; y < pixel.y - box.y + pixel.size; y++) {
        for (let x = pixel.x - box.x; x < pixel.x - box.x + pixel.size; x++) {
          const k = (y * box.w + x) * 4
          sum += (0.299 * levels[k]! + 0.587 * levels[k + 1]! + 0.114 * levels[k + 2]!) / 255
        }
      }
      return sum / (pixel.size * pixel.size)
    }
    context.save()
    context.beginPath()
    for (const key of shapeCells[index] ?? []) context.rect(key % 4096, Math.floor(key / 4096), 1, 1)
    context.clip()
    for (const pixel of on) {
      context.fillStyle = rgbCss(pixelShade(palette, level(pixel), pixel.t))
      context.fillRect(pixel.x, pixel.y, pixel.size, pixel.size)
    }
    // The grid's squares (GRID_SPLIT cells each way), in the shapes only.
    context.strokeStyle = 'rgba(28, 28, 28, 0.14)'
    context.lineWidth = 1 / cw
    context.beginPath()
    const firstX = Math.floor(box.x / GRID_SPLIT) * GRID_SPLIT, firstY = Math.floor(box.y / GRID_SPLIT) * GRID_SPLIT
    for (let x = firstX; x <= box.x + box.w; x += GRID_SPLIT) { context.moveTo(x, box.y); context.lineTo(x, box.y + box.h) }
    for (let y = firstY; y <= box.y + box.h; y += GRID_SPLIT) { context.moveTo(box.x, y); context.lineTo(box.x + box.w, y) }
    context.stroke()
    context.restore()
  })
  pixelFrame = requestAnimationFrame(drawPixels)
}

function pixelBurst(ticks: number[]) {
  clearPixels()
  if (colorMode.value === 'dark' || !shapeCells.length || !splashEl.value) return
  loadPixelVideos()
  pixelPalettes = shapeCells.map((_, index) => {
    const color = BADGE_COLORS[index % BADGE_COLORS.length]!
    const rgb = hexToRgb(color)
    return { rgb, pale: blendRgb(rgb, [255, 255, 255], 0.55), deep: hexToRgb(deepBadgeColor(color)) }
  })
  const rand = mulberry32(7000 + pixelRound * 97)
  pixelRound++
  shapePixels = shapeCells.map((cells, index) => {
    if (!cells.size) return []
    const target = scrambleTargets[index]
    const loose = !shelfLayout && SHAPE_CORNERS[shapeStates[index]!.corner]!.bottom
    return buildPixels(target ? new Set([...cells, ...target]) : cells, loose, pixelRound * 101 + index)
  })
  pixelBoxes.value = shapePixels.map((pixels) => {
    if (!pixels.length) return null
    const x = Math.min(...pixels.map((pixel) => pixel.x)), y = Math.min(...pixels.map((pixel) => pixel.y))
    return { x, y, w: Math.max(...pixels.map((pixel) => pixel.x + pixel.size)) - x, h: Math.max(...pixels.map((pixel) => pixel.y + pixel.size)) - y }
  })
  const last = HEADLINE_MORPH_MS - HEADLINE_LETTER_GAP.last
  // On the letters' beats: those due settle, those about to flicker.
  for (const at of [...ticks.slice(1), last]) {
    pixelTimers.push(setTimeout(() => {
      for (const pixels of shapePixels) {
        for (const pixel of pixels) pixel.on = pixel.at <= at ? true : at > pixel.at - PIXEL_FLICKER_MS ? rand() < 0.4 : false
      }
    }, at))
  }
  pixelTimers.push(setTimeout(() => {
    for (const pixels of shapePixels) for (const pixel of pixels) pixel.on = true
  }, HEADLINE_MORPH_MS))
  // Then away, at random.
  pixelTimers.push(setTimeout(() => {
    const all = shapePixels.flat().filter((pixel) => pixel.on)
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[all[i], all[j]] = [all[j]!, all[i]!]
    }
    for (let step = 1; step <= PIXEL_DISSOLVE_STEPS; step++) {
      pixelTimers.push(setTimeout(() => {
        const from = Math.floor(all.length * (step - 1) / PIXEL_DISSOLVE_STEPS)
        const to = Math.floor(all.length * step / PIXEL_DISSOLVE_STEPS)
        for (const pixel of all.slice(from, to)) pixel.on = false
        if (step === PIXEL_DISSOLVE_STEPS) clearPixels()
      }, PIXEL_DISSOLVE_MS * step / PIXEL_DISSOLVE_STEPS))
    }
  }, HEADLINE_MORPH_MS + 150))
  pixelFrame = requestAnimationFrame(drawPixels)
}

// Light mode, desktop: the masses scramble with the letters. All of them change
// over the letters' own time, on their beats: the cells that change, and some
// along their edges, flicker on and off at random, each landing on the new mass
// at its own moment, as each letter does. The crossing mass keeps its own clock.
const SCRAMBLE_EDGE_SHARE = 0.4 // of a mass's edge cells, flickering though they end as they were
const SCRAMBLE_ON_CHANCE = 0.5
let scrambleTimers: ReturnType<typeof setTimeout>[] = []
function clearScramble() {
  scrambleTimers.forEach(clearTimeout)
  scrambleTimers = []
  scrambleTargets = []
}
function scrambleShapes(ticks: number[]) {
  clearTimeout(shapeTimer)
  clearScramble()
  if (!shapeCells.length) return
  const motion = shapeMotion()
  shapeRound++
  const rand = mulberry32(shapeRound * 7919 + 3)
  const splashWidth = splashEl.value?.getBoundingClientRect().width ?? window.innerWidth
  const plans = shapeStates.map((state, index) => {
    if (SHAPE_CORNERS[state.corner]!.bottom) return null
    const cells = shapeCells[index]!
    const before = shapeTarget(state)
    if (motion.evolve && state.seed !== null) state.phase += motion.evolve
    else state.seed = Math.floor(Math.random() * 1e6)
    state.width = shapeDrift(state.width, motion.sizeMin)
    state.height = shapeDrift(state.height, motion.sizeMin)
    state.slackX = shapeDrift(state.slackX, 0)
    state.slackY = shapeDrift(state.slackY, 0)
    const after = shapeTarget(state)
    const steps = morphSteps(cells, after.cells, after.left - before.left, after.top - before.top, shapeRound * 31 + index)
    // Each cell: where it ends, and when it lands there (like a letter's lock),
    // loosely left to right across the screen, as the pixels do.
    const flicker = new Map<number, { end: boolean, lock: number }>()
    const lockAt = (key: number) => HEADLINE_MORPH_MS * (0.15 + 0.85 * clamp01((shapeGrid.value.x0 + (key % 4096) * shapeGrid.value.cw) / splashWidth * 0.6 + rand() * 0.4))
    for (const step of steps) flicker.set(step.key, { end: step.add, lock: lockAt(step.key) })
    for (const key of cells) {
      if (flicker.has(key) || rand() > SCRAMBLE_EDGE_SHARE) continue
      const edge = [-4096, 1, 4096, -1].some((offset) => !cells.has(key + offset))
      if (edge && after.cells.has(key)) flicker.set(key, { end: true, lock: lockAt(key) })
    }
    return { index, cells, flicker, after: after.cells, video: after.video }
  })
  scrambleTargets = plans.map((plan) => plan?.after ?? null)
  shapeViews.value = shapeViews.value.map((view, index) => ({ ...view, video: plans[index]?.video ?? view.video }))
  const frame = (at: number, final: boolean) => {
    for (const plan of plans) {
      if (!plan) continue
      for (const [key, { end, lock }] of plan.flicker) {
        const on = final || at >= lock ? end : rand() < SCRAMBLE_ON_CHANCE
        if (on) plan.cells.add(key)
        else plan.cells.delete(key)
      }
    }
    shapeViews.value = shapeViews.value.map((view, index) => (plans[index] ? { ...view, ...cellPaths(plans[index]!.cells) } : view))
  }
  for (const at of ticks) scrambleTimers.push(setTimeout(() => frame(at, false), at))
  scrambleTimers.push(setTimeout(() => frame(HEADLINE_MORPH_MS, true), HEADLINE_MORPH_MS))
}

// Headline cycle: each headline holds (SHAPE_MOTION's holdMs), then turns
// straight into the next one letter by letter (decipherFrom) — never
// through an empty or half-empty headline — the white backing mask
// following the lines' widths as they change.
const HEADLINE_MORPH_MS = 1500
// How long the letters hold between changes: a quick flurry, slowing as it lands.
const HEADLINE_LETTER_GAP = { first: 70, last: 300 }
function headlineTicks() {
  const ticks = [0]
  let t = 0
  for (;;) {
    const progress = t / HEADLINE_MORPH_MS
    t += (HEADLINE_LETTER_GAP.first + (HEADLINE_LETTER_GAP.last - HEADLINE_LETTER_GAP.first) * progress * progress) * (0.85 + Math.random() * 0.3)
    // The landing keeps a full gap of its own.
    if (t >= HEADLINE_MORPH_MS - HEADLINE_LETTER_GAP.last * 0.6) return ticks
    ticks.push(t)
  }
}
// When each letter of each line lands: loosely from left to right and from the
// top line down, the very last with the end of the change.
function headlineLocks(lengths: number[]) {
  const raw = lengths.map((length, line) => Array.from({ length }, (_, i) =>
    (i / Math.max(1, length - 1)) * 0.5 + Math.random() * 0.35 + (line / Math.max(1, lengths.length - 1)) * 0.15))
  const latest = Math.max(...raw.flat(), 0.01)
  return raw.map((row) => row.map((value) => HEADLINE_MORPH_MS * (0.15 + 0.85 * (value / latest))))
}
let headlineTimer: ReturnType<typeof setTimeout> | undefined
let morphStops: (() => void)[] = []
// The frame changes at the very moments the letters do (ticks), and each piece of
// it lands on the new headline's silhouette when the letters over it do, so the
// frame settles along with the text.
let frameTimers: ReturnType<typeof setTimeout>[] = []
function shuffleFrame(finalSeed: number, ticks: number[], locks: number[][], targets: DOMRect[]) {
  frameTimers.forEach(clearTimeout)
  frameTimers = []
  maskSeed.value = finalSeed
  const settledAt = (line: number, from: number, to: number) => {
    const row = locks[line] ?? []
    const first = Math.min(Math.floor(from * row.length), row.length - 1)
    return row.length ? Math.max(...row.slice(first, Math.max(first + 1, Math.ceil(to * row.length)))) : 0
  }
  const jump = (index: number) => {
    frameShuffle = { tick: index, time: ticks[index]!, targets, settledAt }
    buildSentenceMasks()
  }
  ticks.forEach((at, index) => {
    if (index) frameTimers.push(setTimeout(() => jump(index), at))
  })
  frameTimers.push(setTimeout(() => {
    frameShuffle = null
    buildSentenceMasks()
  }, HEADLINE_MORPH_MS))
  jump(0)
}

async function nextHeadline() {
  if (leaving.value || !splashEl.value) return
  const previous = [...headlineWords.value]
  headlineIndex.value = (headlineIndex.value + 1) % headlines.value.length
  await nextTick()
  if (leaving.value) return
  const ticks = headlineTicks()
  const lines = [...(splashEl.value?.querySelectorAll<HTMLElement>('.sentence-text') ?? [])]
  const locks = headlineLocks(lines.map((el, i) => Math.max([...(previous[i] ?? '')].length, [...(el.textContent ?? '')].length)))
  // Still the new text as Vue rendered it, before the letters scramble.
  const targets = lines.map((el) => el.getBoundingClientRect())
  morphStops = lines.map((el, i) => decipherFrom(el, previous[i] ?? '', HEADLINE_MORPH_MS, ticks, locks[i]))
  if (colorMode.value === 'dark' || shelfLayout) morphShapes()
  else scrambleShapes(ticks)
  pixelBurst(ticks)
  shuffleFrame(MASK_SEED + headlineIndex.value * 7919, ticks, locks, targets)
  headlineTimer = setTimeout(nextHeadline, HEADLINE_MORPH_MS + shapeMotion().holdMs)
}
function startHeadlineCycle() {
  clearTimeout(headlineTimer)
  startCrossing()
  if (headlines.value.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  headlineTimer = setTimeout(nextHeadline, shapeMotion().holdMs)
}
function stopHeadlineCycle() {
  crossActive = false
  clearTimeout(crossTimer)
  clearTimeout(shapeTimer)
  clearTimeout(headlineTimer)
  morphStops.forEach((stop) => stop())
  morphStops = []
  frameTimers.forEach(clearTimeout)
  frameTimers = []
  frameShuffle = null
  clearPixels()
  clearScramble()
}

function playIntro() {
  if (splashIntro.value !== 'logo') return startHeadlineCycle()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    logoVisible.value = false
    splashIntro.value = 'done'
    return
  }
  const at = (ms: number, fn: () => void) => introTimers.push(setTimeout(fn, ms))
  at(SUBTITLE_AT, () => {
    measureSubtitleLift()
    subtitleShown.value = true
    const box = splashEl.value?.querySelector<HTMLElement>('.splash-subtitle-box')
    if (box) decipherIn(box)
  })
  at(OUT_AT, () => {
    const logo = splashEl.value?.querySelector<HTMLElement>('.splash-logo .decipher-text')
    if (logo) scrambleOut(logo, OUT_MS)
  })
  at(MOVE_AT, () => { subtitleMoving.value = true })
  at(BUILD_AT, buildIn)
  at(HEADLINE_AT, headlineIn)
  at(TAB_AT, () => { splashIntro.value = 'tab' })
  at(FOOTER_AT, () => { splashIntro.value = 'footer' })
  at(DONE_AT, () => {
    splashIntro.value = 'done'
    introSeen.value = '1'
    startHeadlineCycle()
  })
}

const TEXT_OUT_MS = 1300
const leaving = ref(false)

const gridVerticals = computed(() => {
  const g = grid.value
  if (!g) return []
  return Array.from({ length: g.cols + 1 }, (_, k) => g.left + k * g.cellW)
})
const gridHorizontals = computed(() => {
  const g = grid.value
  if (!g) return []
  return Array.from({ length: g.rows + 1 }, (_, k) => g.top + k * g.cellH)
})
// The light grey bars across the frame:
// GRID_TICKS_ACROSS on the top and bottom, GRID_TICKS_SIDE on each side, spread
// evenly and each on the nearest grid line.
const gridTicks = computed(() => {
  const g = grid.value
  if (!g) return []
  const frame = { left: parseFloat(frameStyle.value.left ?? '0'), right: g.boxW - parseFloat(frameStyle.value.right ?? '0'), top: parseFloat(frameStyle.value.top ?? '0'), bottom: g.boxH - parseFloat(frameStyle.value.bottom ?? '0') }
  const long = GRID_TICK_LENGTH, thin = GRID_TICK_WIDTH
  // Evenly across the side, or from `inset` in at each end.
  const spread = (lines: number[], count: number, inset?: number) => Array.from({ length: count }, (_, i) => {
    const at = inset === undefined || count < 2 ? (i + 1) / (count + 1) : inset + (1 - 2 * inset) * i / (count - 1)
    return lines[Math.round((lines.length - 1) * at)]!
  })
  const ticks: Record<string, string>[] = []
  for (const y of spread(gridHorizontals.value, GRID_TICKS_SIDE, GRID_TICK_SIDE_INSET)) {
    for (const x of [frame.left, frame.right - 1]) ticks.push({ left: `${x + 0.5 - thin / 2}px`, top: `${y + 0.5 - long / 2}px`, width: `${thin}px`, height: `${long}px` })
  }
  for (const x of spread(gridVerticals.value, GRID_TICKS_ACROSS)) {
    for (const y of [frame.top, frame.bottom - 1]) ticks.push({ left: `${x + 0.5 - long / 2}px`, top: `${y + 0.5 - thin / 2}px`, width: `${long}px`, height: `${thin}px` })
  }
  return ticks
})
// The frame's four sides as lines (the build's SVG), on its 1px border.
const frameSides = computed(() => {
  const g = grid.value
  if (!g) return []
  const left = parseFloat(frameStyle.value.left ?? '0') + 0.5
  const top = parseFloat(frameStyle.value.top ?? '0') + 0.5
  const right = g.boxW - parseFloat(frameStyle.value.right ?? '0') - 0.5
  const bottom = g.boxH - parseFloat(frameStyle.value.bottom ?? '0') - 0.5
  return [
    { x1: left - 0.5, x2: right + 0.5, y1: top, y2: top },
    { x1: left - 0.5, x2: right + 0.5, y1: bottom, y2: bottom },
    { x1: left, x2: left, y1: top - 0.5, y2: bottom + 0.5 },
    { x1: right, x2: right, y1: top - 0.5, y2: bottom + 0.5 },
  ]
})
const gridNumbers = computed(() => gridHorizontals.value
  .filter((_, index) => index % GRID_NUMBER_EVERY === 0)
  .map((y, index) => ({
    // The middle of the line: the grid's closing line sits a pixel higher, being
    // its border, inside its box (.splash-grid).
    y: y === grid.value?.bottom ? y - 0.5 : y + 0.5,
    label: String(index + 1).padStart(2, '0'),
  })))
function leave() {
  if (leaving.value) return
  stopHeadlineCycle()
  const g = grid.value
  if (!g || !splashEl.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('continue')
    return
  }
  leaving.value = true
  closeFrame()
  introSeen.value = '1'
  for (const el of splashEl.value.querySelectorAll<HTMLElement>('.sentence-text, .splash-subtitle-box, .corner-title, .corner-badge, .splash-cta, .splash-tab-ticker-track, .image-label')) {
    scrambleOut(el, TEXT_OUT_MS)
  }
  setTimeout(() => emit('continue'), OUTRO_MS)
}

// A real link (for crawlers, and to open in a new tab), but a plain click plays
// the exit first, then the guide's draw-in (dismissSplash). In the capture phase
// (@click.capture): by the bubble phase the link has already navigated.
function enterGuide(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey) return
  event.preventDefault()
  leave()
}

// The button. Shelf layout: it follows the subtitle. Desktop: halfway between
// the subtitle's box and the grid's bottom line, as far from one as from the
// other. Mobile: on that line (computeGrid). Offsets, not a measured box: the
// subtitle is moved by a transform while it's next to the logo, and this is
// where it ends up.
const SHELF_CTA_GAP = 22
function placeCta() {
  if (!splashEl.value || !grid.value) return
  const subtitle = splashEl.value.querySelector<HTMLElement>('.splash-subtitle')
  const cta = splashEl.value.querySelector<HTMLElement>('.splash-cta')
  if (!subtitle || !cta) return
  const subtitleBottom = subtitle.offsetTop + subtitle.offsetHeight
  if (shelfLayout) ctaStyle.value = { top: `${subtitleBottom + SHELF_CTA_GAP + cta.offsetHeight / 2}px` }
  else if (window.innerWidth > 1150) ctaStyle.value = { top: `${(subtitleBottom + grid.value.bottom) / 2}px` }
}

// The strip's height for every image to stand within `room`. An image stands at its
// share of that height (imageVariant) unless its width's cap stops it shorter, which
// is why most phones keep the full height. An image still loading could be any shape.
function stripFitHeight(room: number) {
  const maxWidth = window.innerWidth * STRIP_IMAGE_MAX_WIDTH
  const imgs = [...(splashEl.value?.querySelectorAll<HTMLImageElement>('.splash-images-track img') ?? [])]
  let height = stripFullHeight
  imgs.forEach((img, index) => {
    const variant = imageVariant(index)
    const capped = img.naturalWidth ? maxWidth * img.naturalHeight / img.naturalWidth : Infinity
    if (Math.min(stripFullHeight * variant, capped) > room) height = Math.min(height, room / variant)
  })
  return Math.max(stripMinHeight, height)
}

// Mobile: slides the strip up from where computeGrid put it, so its tallest image
// (often short of the strip's full height, its width being capped) is as far from
// the subtitle above as from the button below. The text stays put. Returns whether
// it moved. Measured, so it runs again as each image arrives (onStripImageLoad).
// First, the strip's height is brought down if an image would leave less than a
// margin each side (stripFitHeight).
function placeStrip() {
  if (!stripTop.value || !grid.value || !splashEl.value) return false
  const tallest = Math.max(0, ...[...splashEl.value.querySelectorAll<HTMLElement>('.splash-images-track img')].map((img) => img.offsetHeight))
  if (!tallest) return false
  stripTallest = tallest
  const subtitleBottom = stripTop.value - stripGap
  const ctaTop = grid.value.bottom - (splashEl.value.querySelector<HTMLElement>('.splash-cta')?.offsetHeight ?? 0) / 2
  const height = stripFitHeight(ctaTop - subtitleBottom - stripGap * 2)
  if (Math.abs(height - imagesBandHeight.value) > 0.5) {
    imagesBandHeight.value = height
    stripStyle.value = { ...stripStyle.value, height: `${height}px` }
    nextTick(() => {
      placeStrip()
      buildShapes()
    })
    return true
  }
  const gap = Math.max(0, (ctaTop - subtitleBottom - tallest) / 2)
  const top = `${ctaTop - gap - imagesBandHeight.value / 2}px`
  if (stripStyle.value.top === top) return false
  stripStyle.value = { ...stripStyle.value, top }
  return true
}

let stripFrame = 0
function onStripImageLoad() {
  if (!stripTop.value) return
  cancelAnimationFrame(stripFrame)
  stripFrame = requestAnimationFrame(() => {
    if (placeStrip()) nextTick(buildShapes)
  })
}

function handleResize() {
  computeGrid()
  fitHeadlines()
  nextTick(() => {
    fitSubtitleBox()
    buildSentenceMasks()
  })
  nextTick(placeCta)
  nextTick(async () => {
    placeStrip()
    await nextTick()
    buildShapes()
  })
}

watch(() => headlineWords.value.length, observeLines, { flush: 'post' })

onMounted(() => {
  toneImages()
  playIntro()
  handleResize()
  observeLines()
  nextTick(() => { measured.value = true })
  window.addEventListener('resize', handleResize)
  // The display font loads async (main.css `@import`) — if it swaps in
  // after this first measurement, the lines' widths shift and the fit and
  // the mask no longer match. Re-measure once it's actually settled.
  document.fonts?.ready?.then(handleResize)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const video of splashEl.value?.querySelectorAll('video') ?? []) video.pause()
  }
})

onUnmounted(() => {
  clearPixels()
  for (const video of pixelVideos) video.pause()
  introTimers.forEach(clearTimeout)
  stopHeadlineCycle()
  cancelAnimationFrame(stripFrame)
  lineObserver?.disconnect()
  if (splashIntro.value !== 'done') splashIntro.value = 'done'
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <section
    ref="splashEl"
    class="splash"
    :class="[{
      'is-leaving': leaving,
      'is-shelf': shelfLayout,
      'is-returning': returning,
      'is-measured': measured,
      'intro-subtitle-shown': subtitleShown,
      'intro-subtitle-moving': subtitleMoving,
      'intro-headline-shown': headlineShown,
      'intro-logo-up': logoVisible,
    }, introClass]"
    :style="{ '--subtitle-lift': `${subtitleLift}px` }"
  >
    <!-- Arrival: white screen, DE.CO.DE growing in from nothing. -->
    <div v-if="logoVisible" class="splash-logo" aria-hidden="true">
      <DecipherText text="DE.CO.DE" grow :grow-max="2" :delay="LOGO_START_MS" />
    </div>
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
        pathLength="1"
        fill="var(--color-surface)"
        stroke="var(--color-ink)"
        stroke-width="1"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <!-- The tab's label (TAB_TEXT), sliding, not
         scrolling. Kept inside the trapezoid's own *top-line* span
         (tabLeftInset/tabRightInset), not the full tabWidth bounding box —
         the shape is narrower near the top (the diagonal shoulders), with
         a further 2% padding on each side so the text never touches them. -->
    <div
      class="splash-tab-ticker"
      :style="{
        top: `${tabTop}px`,
        left: `${tabLeftInset}px`,
        width: `${tabWidth - tabLeftInset - tabRightInset}px`,
        height: `${tabHeight}px`,
        paddingLeft: `${(tabWidth - tabLeftInset - tabRightInset) * 0.02}px`,
        paddingRight: `${(tabWidth - tabLeftInset - tabRightInset) * 0.02}px`,
      }"
    >
      <a
        :href="TAB_LINK"
        target="_blank"
        rel="noopener"
        class="splash-tab-ticker-link"
      >
      <div class="splash-tab-ticker-track text-small">
        <!-- Too long for the tab: it slides past endlessly — three copies (always
             enough to fill the tab), the loop jumps back by exactly one of them. -->
        <span class="splash-tab-ticker-slide">
          <span>{{ TAB_TEXT }}</span>
          <span aria-hidden="true">{{ TAB_TEXT }}</span>
          <span aria-hidden="true">{{ TAB_TEXT }}</span>
        </span>
      </div>
      </a>
    </div>

    <div v-if="satelliteUrl" class="splash-satellite" :style="{ ...gridStyle, '--satellite': `url(${satelliteUrl})` }" aria-hidden="true">
      <!-- Dark mode's own gray duotone (app.vue's #duotone-dark: same
           luma, same neutral grays), but not inverted: black lands on the
           page's own background, and the land's mid tones are lifted so its
           coasts and relief read as a map. -->
      <svg width="0" height="0" style="position: absolute">
        <filter id="splash-satellite-duotone" color-interpolation-filters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.299 0.587 0.114 0 0
                    0.299 0.587 0.114 0 0
                    0.299 0.587 0.114 0 0
                    0     0     0     1 0"
          />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.10980 0.2 0.5 0.78 0.92" />
            <feFuncG type="table" tableValues="0.10980 0.2 0.5 0.78 0.92" />
            <feFuncB type="table" tableValues="0.10980 0.2 0.5 0.78 0.92" />
          </feComponentTransfer>
        </filter>
      </svg>
    </div>
    <div v-if="GRID_FRAME" class="splash-grid-frame" :style="frameStyle" aria-hidden="true" />
    <div v-if="GRID_FRAME" class="splash-grid-ticks" aria-hidden="true">
      <span
        v-for="(tick, index) in gridTicks"
        :key="index"
        class="splash-grid-tick"
        :style="{ ...tick, '--tick-index': index }"
      />
    </div>
    <div class="splash-grid" :style="gridStyle" aria-hidden="true" />
    <!-- The grid as separate lines, each moving on its own: growing out of
         their centres on arrival (is-building), retracting on exit. -->
    <svg
      v-if="(leaving || splashIntro === 'build') && grid"
      class="splash-grid-lines"
      :class="{ 'is-building': !leaving }"
      :width="grid.boxW"
      :height="grid.boxH"
      aria-hidden="true"
    >
      <line
        v-for="(x, k) in gridVerticals"
        :key="`v${k}`"
        class="splash-grid-v"
        :x1="x + 0.5"
        :x2="x + 0.5"
        :y1="grid.top"
        :y2="grid.bottom + 1"
      />
      <line
        v-for="(y, k) in gridHorizontals"
        :key="`h${k}`"
        class="splash-grid-h"
        :x1="grid.left"
        :x2="grid.right + 1"
        :y1="y + 0.5"
        :y2="y + 0.5"
      />
      <!-- The frame too, on arrival only: it draws itself just after the grid. -->
      <template v-if="!leaving && GRID_FRAME">
        <line v-for="(side, k) in frameSides" :key="`f${k}`" class="splash-grid-frame-line" v-bind="side" />
      </template>
    </svg>

    <div
      v-for="(article, index) in (articleTitles ?? []).slice(0, 4)"
      :key="article.title"
      class="splash-corner text-h2"
      :style="cornerStyles[index]"
    >
      <div class="corner-title-wrap">
        <span class="corner-badge text-label" :style="{ backgroundColor: BADGE_COLORS[index % BADGE_COLORS.length] }">
          {{ index + 1 }}
        </span>
        <NuxtLink :to="`/guide/${article.id}`" class="corner-link"><div class="corner-title">{{ article.title }}</div></NuxtLink>
      </div>
    </div>

    <!-- Over the grid, under the image band and the headline:
         same z-index as those, so DOM order sets it. Placed by buildShapes,
         at least SHAPE_EDGE_MARGIN from the top tab's line and the footer. -->
    <div class="splash-shapes" aria-hidden="true">
      <div
        v-for="(view, index) in shapeViews"
        :key="index"
        class="splash-shape"
        :style="{ left: `${shapeGrid.x0}px`, top: `${shapeGrid.y0}px`, width: `${shapeGrid.cols * shapeGrid.cw}px`, height: `${shapeGrid.rows * shapeGrid.ch}px` }"
      >
        <svg :viewBox="`0 0 ${shapeGrid.cols} ${shapeGrid.rows}`" preserveAspectRatio="none">
          <defs>
            <clipPath :id="`splash-shape-clip-${index}`">
              <path :d="view.fill" :transform="`scale(${shapeGrid.cw} ${shapeGrid.ch})`" />
            </clipPath>
          </defs>
          <path class="splash-shape-fill" :d="view.fill" />
        </svg>
        <canvas
          v-if="pixelBoxes[index]"
          :ref="(el) => { if (el) pixelCanvases[index] = el as HTMLCanvasElement }"
          class="splash-shape-pixels"
          :style="{ left: `${pixelBoxes[index]!.x * shapeGrid.cw}px`, top: `${pixelBoxes[index]!.y * shapeGrid.ch}px`, width: `${pixelBoxes[index]!.w * shapeGrid.cw}px`, height: `${pixelBoxes[index]!.h * shapeGrid.ch}px` }"
        />
        <div v-if="colorMode === 'dark'" class="splash-shape-video" :style="{ clipPath: `url(#splash-shape-clip-${index})` }">
          <video :src="SHAPE_VIDEOS[index]" :style="{ ...view.video, transitionDuration: `${shapeMotion().morphMs}ms` }" autoplay muted loop playsinline />
        </div>
        <svg :viewBox="`0 0 ${shapeGrid.cols} ${shapeGrid.rows}`" preserveAspectRatio="none">
          <path class="splash-shape-outline" :d="view.outline" :stroke="BADGE_COLORS[index]" />
        </svg>
      </div>
    </div>

    <!-- Every second line of the grid, numbered in the margin to its left. Over the
         pixel masses, under the image band: same z-index, so DOM order sets it. -->
    <div v-if="grid && GRID_NUMBERS" class="splash-grid-numbers" :style="{ width: `${grid.left}px` }" aria-hidden="true">
      <span
        v-for="(number, index) in gridNumbers"
        :key="index"
        :style="{ top: `${number.y}px` }"
      >[{{ number.label }}]</span>
    </div>

    <!-- Behind .splash-info (lower z-index) — a background layer, not a
         band confined to the margin strip, now that it's centered in the
         viewport like the text is. -->
    <!-- Each image's own duotone (toneImages). -->
    <svg v-if="TONE_AUTO" width="0" height="0" style="position: absolute" aria-hidden="true">
      <template v-for="(tables, url) in toneTables" :key="url">
        <filter v-for="mode in (['light', 'dark'] as const)" :id="`${toneId(String(url))}-${mode}`" :key="mode" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" :tableValues="tables[mode][0]" />
            <feFuncG type="table" :tableValues="tables[mode][1]" />
            <feFuncB type="table" :tableValues="tables[mode][2]" />
          </feComponentTransfer>
        </filter>
      </template>
    </svg>
    <div v-if="images?.length" ref="imagesEl" class="splash-images" :style="stripStyle" aria-hidden="true">
      <div class="splash-images-track">
        <div v-for="(image, index) in scrollingImages" :key="`${image.url}-${index}`" class="splash-image-wrapper">
          <span
            v-if="imageLabel(index, image.alt)"
            class="image-label text-small"
            :class="{ 'is-hovered': hoveredIndex === index }"
            :style="{ backgroundColor: imageBadgeColor(index), '--chip-deep': deepBadgeColor(imageBadgeColor(index)!) }"
          >
            {{ imageLabel(index, image.alt) }}
          </span>
          <img
            :src="image.url"
            :alt="cleanAlt(image.alt)"
            :class="{ 'is-hovered': hoveredIndex === index, 'is-toned': toneTables[image.url] }"
            :style="{ maxHeight: imageHeight(index), '--tone-light': `url(#${toneId(image.url)}-light)`, '--tone-dark': `url(#${toneId(image.url)}-dark)` }"
            @load="onStripImageLoad"
            @mouseenter="hoveredIndex = canHover() ? index : null"
            @mouseleave="hoveredIndex = null"
          >
        </div>
      </div>
    </div>

    <div class="splash-info" :style="infoStyle">
      <div
        v-if="headlineWords.length"
        ref="sentencesEl"
        class="splash-sentences"
        :style="{ fontSize: `${headlineFontSize}px`, lineHeight: HEADLINE_LINE_HEIGHT, minHeight: `${headlineMaxLines * HEADLINE_LINE_HEIGHT}em` }"
      >
        <!-- Both the white backing (.sentence-fill) and the text itself
             live inside this one wrapper, which has an SVG mask
             (#splash-headline-mask, below) applied to it — `base` rects
             are the mask's visible (white) region, `bites` are painted
             black *into* that same mask, actually punching holes rather
             than sitting on top as an opaque patch. Where a bite lands,
             the whole wrapper — backing and letter ink both — goes
             transparent, revealing whatever is behind the headline (grid,
             photo band) through it, like the piece hasn't been decoded. -->
        <div ref="maskedEl" class="sentence-masked">
          <div class="sentence-fill" aria-hidden="true" />
          <div
            v-for="(word, index) in headlineWords"
            :key="index"
            class="sentence-line"
            :style="{ transform: `translateX(${sentenceOffset(index)})` }"
          >
            <span class="sentence-text" :ref="(el) => setSentenceRef(el as Element | null, index)">{{ word }}</span>
          </div>
        </div>
        <!-- Literal #fff/#000, never theme tokens: a mask reads luminance
             (white = shown, black = hidden), not a color — a token that
             turns near-black in dark mode hid the whole headline. -->
        <svg class="sentence-mask-defs" aria-hidden="true">
          <mask id="splash-headline-mask" maskUnits="userSpaceOnUse" x="-500" y="-500" width="8000" height="2000">
            <rect
              v-for="(rect, ri) in paragraphMask.base"
              :key="`b${ri}`"
              shape-rendering="crispEdges"
              fill="#fff"
              :x="rect.left"
              :y="rect.top"
              :width="rect.width"
              :height="rect.height"
            />
            <rect
              v-for="(rect, bi) in paragraphMask.bites"
              :key="`n${bi}`"
              shape-rendering="crispEdges"
              fill="#000"
              :x="rect.left"
              :y="rect.top"
              :width="rect.width"
              :height="rect.height"
            />
          </mask>
        </svg>
      </div>
      <!-- Lines as typed in the CMS (Sous-titre). -->
      <div v-if="subtitleLines.length" class="text-label splash-subtitle">
        <span class="splash-subtitle-box">
          {{ subtitleLines[0] }}<span v-if="subtitleLines.length > 1" class="splash-subtitle-rest"><template v-for="(line, index) in subtitleLines.slice(1)" :key="index"><br>{{ line }}</template></span>
        </span>
      </div>
    </div>

    <!-- Its own element (not inside .splash-info, which is centered on the
         full viewport) so its vertical position can be pinned to the
         grid's bottom line instead. -->
    <NuxtLink to="/guide" class="splash-cta btn-fill text-label" :style="ctaStyle" @click.capture="enterGuide">
      Enter the investigation guide
    </NuxtLink>

  </section>
</template>

<style scoped>
.splash {
  position: relative;
  /* Leaves exactly enough room for SiteFooter.vue below it, so the splash
     + footer together fit one screen with no scrolling. `svh` (the screen
     with a phone's address bar showing), since `vh` counts the area under
     that bar too, which pushed the bottom of the splash and its button out
     of view. `vh` only as the fallback for older browsers. */
  height: calc(100vh - var(--footer-height));
  height: calc(100svh - var(--footer-height));
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
  justify-content: center;
}

.splash-tab-ticker-link {
  min-width: 0;
  max-width: 100%;
  color: inherit;
  text-decoration: none;
}

.splash-tab-ticker-link:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

/* Keeps the track's own line, cut or sliding, inside the tab. */
.splash-tab-ticker-link .splash-tab-ticker-track {
  display: block;
  font-size: 12pt;
}

.corner-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.splash-tab-ticker-track {
  width: 100%;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
}

.splash-tab-ticker-slide {
  display: inline-flex;
  animation: splash-tab-ticker-slide 24s linear infinite;
}

/* Gap after each copy, so the loop's seam spaces like the rest. */
.splash-tab-ticker-slide span {
  padding-right: 2.5em;
}

@keyframes splash-tab-ticker-slide {
  to {
    transform: translateX(calc(-100% / 3));
  }
}

/* `translate`, not `transform`: it adds up with the slide running alongside. */
@keyframes splash-tab-ticker-enter {
  from {
    translate: 55vw 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .splash-tab-ticker-slide {
    animation: none;
  }
}

.splash-info {
  position: relative;
  z-index: 2;
}

/* Returning visitor (script, `returning`). */
.splash.is-returning {
  opacity: 0;
}

.splash.is-returning.is-measured {
  opacity: 1;
  transition: opacity 0.4s ease;
}

/* Black 1px outline per cell — adjacent cells share grid lines, so this
   draws actual outlined cells rather than doubled-up borders. Position and
   background-size come from `gridStyle` (computeGrid), not fixed here.
   The repeating background only draws a line at each tile's *start*
   (left/top), so the closing line at the container's own right/bottom
   edge falls exactly on the boundary and gets clipped — an explicit
   border fills in that last line. */
.splash {
  /* The grid's lines, light so its many small cells read as a fine mesh, and
     the frame around it, grey (computeGrid's settings for the sizes). */
  --grid-line: color-mix(in srgb, var(--color-ink) 28%, transparent);
  --grid-frame: #c4c6c9; /* a light silver grey */
}

.splash-grid {
  position: absolute;
  z-index: 0;
  background-image:
    linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  border-right: 1px solid var(--grid-line);
  border-bottom: 1px solid var(--grid-line);
}

.splash-grid-frame {
  position: absolute;
  z-index: 0;
  border: 1px solid var(--grid-frame);
  pointer-events: none;
  transition: opacity 0.8s ease;
}

.splash.intro-logo .splash-grid-frame,
.splash.is-leaving .splash-grid-frame,
.splash.intro-logo .splash-grid-ticks,
.splash.is-leaving .splash-grid-ticks {
  opacity: 0;
}

/* Arrival: the frame draws itself as lines (.splash-grid-frame-line) just after
   the grid's own, then its bars pop in one by one. */
.splash.intro-build .splash-grid-frame {
  opacity: 0;
  transition: none;
}

.splash-grid-lines.is-building .splash-grid-frame-line {
  stroke: var(--grid-frame);
  animation: splash-grow-in 0.9s cubic-bezier(0.2, 0.6, 0.3, 1) 0.25s both;
}

.splash.intro-build .splash-grid-ticks {
  opacity: 1;
  transition: none;
}

.splash.intro-build .splash-grid-tick {
  animation: splash-grow-in 0.35s cubic-bezier(0.2, 0.6, 0.3, 1) both;
  animation-delay: calc(0.75s + var(--tick-index) * 0.05s);
}

/* Little bars across the frame (gridTicks): the page's own colour inside (white
   in light mode), outlined in the frame's grey. */
.splash {
  --grid-tick: var(--grid-frame);
}

/* Dark mode only: in light mode the frame stays a plain line. */
:root:not([data-theme='dark']) .splash-grid-ticks {
  display: none;
}

.splash-grid-tick {
  position: absolute;
  box-sizing: border-box;
  background: var(--color-surface);
  border: 1px solid var(--grid-tick);
}

.splash-grid-ticks {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  transition: opacity 0.8s ease;
}


/* Exit transition (leave()) — the background grid hands over to the
   per-line SVG copy, every line retracting into its own centre at the
   same moment, slow then fast, and fading out over the second half so
   it's gone before the trim completes (and well before the text and
   images, ~1.1-1.3s). */
.splash.is-leaving .splash-grid {
  background-image: none;
  border-color: transparent;
}

.splash-grid-lines {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.splash-grid-lines line {
  stroke: var(--grid-line);
  stroke-width: 1;
  shape-rendering: crispEdges;
  transform-box: fill-box;
  transform-origin: center;
}

.splash-grid-v {
  animation: splash-retract-v 0.7s cubic-bezier(0.7, 0, 0.9, 0.4) both;
}

.splash-grid-h {
  animation: splash-retract-h 0.7s cubic-bezier(0.7, 0, 0.9, 0.4) both;
}

@keyframes splash-retract-v {
  50% {
    opacity: 1;
  }

  90% {
    opacity: 0;
  }

  100% {
    opacity: 0;
    transform: scaleY(0);
  }
}

@keyframes splash-retract-h {
  50% {
    opacity: 1;
  }

  90% {
    opacity: 0;
  }

  100% {
    opacity: 0;
    transform: scaleX(0);
  }
}

/* Text blocks don't move: their letters vanish (scrambleOut), and only
   their own boxes (headline/subtitle white backing, CTA fill, badges)
   fade once the letters are nearly all gone. Each image is masked away
   by a clip closing in from its top and bottom onto its own centre line
   (the picture itself never scales or deforms), slow then fast. The pixel
   masses simply fade away. */
.splash-info,
.splash-corner,
.splash-cta,
.splash-tab-ticker {
  transition: opacity 0.35s ease 1.15s;
}

.splash-image-wrapper {
  clip-path: inset(0 0 0 0);
  transition: clip-path 1.1s cubic-bezier(0.7, 0, 0.9, 0.4);
}

.splash.is-leaving .splash-image-wrapper {
  clip-path: inset(50% 0 50% 0);
}

.splash.is-leaving .splash-info {
  pointer-events: none;
}

/* Closes the way the images do, and the headline's frame (closeFrame). */
.splash-subtitle-box {
  clip-path: inset(0 -2px 0 -2px);
  transition: clip-path 1.1s cubic-bezier(0.7, 0, 0.9, 0.4);
}

.splash.is-leaving .splash-subtitle-box {
  clip-path: inset(50% -2px 50% -2px);
}

.splash.is-leaving .splash-corner,
.splash.is-leaving .splash-cta,
.splash.is-leaving .splash-tab-ticker {
  opacity: 0;
  pointer-events: none;
}

.splash-shapes {
  transition: opacity 0.8s ease;
}

.splash-grid-numbers {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 1;
  font-family: var(--font-mono);
  font-size: 8px;
  line-height: 1;
  /* The mono's alternative zero, on top of the site's round dots (main.css). */
  font-feature-settings: 'ss11', 'zero';
  color: var(--color-ink);
  pointer-events: none;
  transition: opacity 0.8s ease;
}

.splash-grid-numbers span {
  position: absolute;
  right: 7px;
  opacity: 0.45;
  /* Down to the digits themselves, so their middle is what sits on the line. */
  text-box: trim-both cap alphabetic;
  /* Its digits sit a touch lower than its capitals. */
  transform: translateY(calc(-50% - 0.4px));
}

.splash.intro-logo .splash-grid-numbers,
.splash.is-leaving .splash-grid-numbers {
  opacity: 0;
}

/* No margin to sit in, at this width. */
@media (max-width: 1150px) {
  .splash-grid-numbers {
    display: none;
  }
}

.splash-shapes {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.splash-shape {
  position: absolute;
  top: 0;
}

.splash-shape svg,
.splash-shape-video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Sized to the mass it's filling (script, shapeVideoBox), gliding to the next one
   as the cells around it change: only ever seen through them. */
.splash-shape-video video {
  position: absolute;
  display: block;
  object-fit: cover;
  transition: left 1s ease, top 1s ease, width 1s ease, height 1s ease;
  filter: url(#duotone-dark);
}

.splash-shape-fill {
  fill: var(--color-surface);
  shape-rendering: crispEdges;
}

/* Light mode's pixel windows (script, pixelBurst, drawPixels). */
.splash-shape-pixels {
  position: absolute;
  display: block;
}

.splash-shape-outline {
  fill: none;
  stroke-width: 2px;
  stroke-linecap: square;
  vector-effect: non-scaling-stroke;
  shape-rendering: crispEdges;
}

/* Under the grid (same box, earlier in the DOM, same z-index) and the
   pixel masses. In dark mode's gray duotone (#splash-satellite-duotone)
   so it reads as a texture behind the page, not a photo; fades in as the splash builds,
   out with the masses on exit. */
.splash-satellite {
  position: absolute;
  z-index: 0;
  transition: opacity 1.6s ease;
  pointer-events: none;
}

.splash-satellite::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--satellite) center / cover no-repeat;
  filter: url(#splash-satellite-duotone);
  opacity: 0.8;
}

.splash.intro-logo .splash-satellite {
  opacity: 0;
  transition: none;
}

.splash.is-leaving .splash-satellite {
  opacity: 0;
  transition-duration: 0.8s;
}

.splash.is-leaving .splash-shapes {
  opacity: 0;
}

/* Arrival (script, playIntro). The logo screen covers everything, in
   the display face, the word growing in the middle. */
.splash-logo {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-text);
  font-weight: 700;
  font-size: clamp(20px, 3.6vw, 64px);
  letter-spacing: -0.01em;
}


/* Until 'build', nothing behind the logo is drawn yet. */
.splash.intro-logo .splash-grid,
.splash.intro-build .splash-grid {
  background-image: none;
  border-color: transparent;
}

.splash-grid-lines.is-building line {
  animation: splash-grow-in 0.9s cubic-bezier(0.2, 0.6, 0.3, 1) both;
}

@keyframes splash-grow-in {
  from {
    transform: scale(0);
  }
}

.splash.intro-logo .splash-image-wrapper {
  clip-path: inset(50% 0 50% 0);
  transition: none;
}

.splash.intro-build .splash-image-wrapper {
  transition: clip-path 1s cubic-bezier(0.2, 0.6, 0.3, 1) 0.2s;
}

.splash.intro-logo .splash-corner,
.splash.intro-logo .splash-cta {
  opacity: 0;
  transition: none;
}

.splash.intro-build .splash-corner,
.splash.intro-build .splash-cta {
  transition: opacity 0.4s ease;
}

/* The headline arrives last (headlineIn), at once, its letters then
   deciphering: no fade — a half-transparent backing let the grid and
   photos show through it — and no clip either, which breaks the SVG mask
   that cuts its white backing to the text's shape. */
.splash.intro-logo .splash-sentences,
.splash.intro-build:not(.intro-headline-shown) .splash-sentences {
  visibility: hidden;
}

/* On the logo screen the subtitle is inverted, white on a black box;
   arrived in its spot, it snaps (no transition) to its own black on
   white as the build starts. */
.splash.intro-logo .splash-subtitle-box {
  background-color: var(--color-ink);
  color: var(--color-surface);
}

/* The subtitle shows above the logo screen for as long as that screen
   exists (not just the logo phase — it lingers while fading): its whole
   block (.splash-info, its own stacking context) is lifted over it.
   It's transparent, and the headline inside is still hidden until the
   build starts. The subtitle stays hidden until its own moment. */
.splash.intro-logo-up .splash-info {
  z-index: 11;
}

/* Just under the logo first, then — once the logo has scrambled away —
   down to its own spot (MOVE_MS). */
.splash.intro-logo .splash-subtitle {
  transform: translateY(var(--subtitle-lift));
}

.splash.intro-logo.intro-subtitle-moving .splash-subtitle {
  transform: translateY(0);
  transition: transform 0.9s cubic-bezier(0.45, 0, 0.2, 1);
}

.splash.intro-logo:not(.intro-subtitle-shown) .splash-subtitle {
  visibility: hidden;
}

/* The top tab and its baseline trace themselves last (pathLength=1),
   their white fill settling in as the stroke closes; the ticker after. */
.splash.intro-logo .splash-tab path,
.splash.intro-build .splash-tab path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  fill-opacity: 0;
}

.splash.intro-tab .splash-tab path {
  stroke-dasharray: 1;
  animation: splash-tab-draw 0.9s cubic-bezier(0.45, 0, 0.25, 1) both;
}

@keyframes splash-tab-draw {
  from {
    stroke-dashoffset: 1;
    fill-opacity: 0;
  }

  70% {
    fill-opacity: 0;
  }

  to {
    stroke-dashoffset: 0;
    fill-opacity: 1;
  }
}

.splash.intro-logo .splash-tab-ticker,
.splash.intro-build .splash-tab-ticker {
  opacity: 0;
}

.splash.intro-tab .splash-tab-ticker {
  transition: opacity 0.4s ease 0.7s;
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
  /* One outline around the headline's masked backing and the subtitle's box
     together, holes included: shadows follow the mask, which a border can't.
     Each one builds on the last, so corners close. */
  filter:
    drop-shadow(1px 0 0 var(--color-ink))
    drop-shadow(-1px 0 0 var(--color-ink))
    drop-shadow(0 1px 0 var(--color-ink))
    drop-shadow(0 -1px 0 var(--color-ink));
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
  box-sizing: border-box;
  background: var(--color-surface);
  padding: 20px 28px;
  font-size: 14pt;
  font-weight: 400;
  /* Line breaks come from the CMS (subtitleLines): a line only wraps further
     if it doesn't fit the screen. */
  max-width: 90vw;
  line-height: 1.15;
  text-align: center;
  text-wrap: balance;
}

.splash-cta {
  position: absolute;
  left: 50%;
  /* `top` (the grid's bottom line, in px) comes from `ctaStyle` —
     centers this button's own box exactly on that line. */
  transform: translate(-50%, -50%);
  z-index: 2;
  /* Fill/hover colors: .btn-fill (main.css). */
  border-radius: 0;
  padding: 18px;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

/* Article titles near the grid's four corners. Position, max-width and
   max-height all come from cornerStyles (computeGrid) — computed in px
   from the grid's own measured bounds, which is what guarantees these
   stay inside it on any viewport rather than an independent percentage
   guess that only happens to fit at one size. */
.splash-corner {
  /* Hidden for now, still in the HTML as links to the three chapters. Remove
     this line to bring them back. */
  display: none;
  position: absolute;
  z-index: 2;
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
  color: var(--color-ink);
}

/* Display text — ABC Areal bold, same family/weight as the footer brand.
   No list styling since this is now plain stacked divs, not a <ul>. Each
   line's translateX (inline style, sentenceOffset) staggers them instead
   of sharing one center axis. Font size and height come from fitHeadlines
   (script). Full width, so the mask's box (.sentence-masked) can't clip a
   line shifted out to the side, and a headline changing width moves nothing
   around it. */
.splash-sentences {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  font-family: var(--font-text);
  font-weight: 700;
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
  /* The mask is only as big as this box and tiles past it by default —
     a copy of the lower lines' silhouette was showing as a solid white
     band above the headline. No repeat, and the box padded out (negative
     margin keeps the layout unchanged) so every outward extension still
     falls inside the mask's own area. */
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
  padding: 80px;
  margin: -80px;
}

/* Plain solid fill — the mask alone carves it down to the exact irregular
   silhouette (buildParagraphMask's `base` rects), so this just needs to
   generously over-cover every line's own measured box; the 80px padding
   (.sentence-masked) comfortably clears the largest possible extension
   (46px) with room to spare. */
.sentence-fill {
  position: absolute;
  inset: 0;
  background: var(--color-surface);
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

/* A line stays one line: the CMS decides where they break. */
.sentence-text {
  display: inline-block;
  white-space: nowrap;
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

/* The shelf layout (script, shelfLayout): the headline up top, the images
   standing along the bottom on one baseline. */
.splash.is-shelf .splash-info {
  justify-content: flex-start;
  padding-top: 11vh;
}

.splash.is-shelf .splash-images {
  top: auto;
  bottom: 3vh;
  height: 34vh;
  transform: none;
}

.splash.is-shelf .splash-images-track {
  align-items: flex-end;
}

.splash-images-track img.is-toned {
  filter: var(--tone-light);
}

:root[data-theme='dark'] .splash-images-track img.is-toned {
  filter: var(--tone-dark);
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
  /* Same as the subtitle chips (BadgeChip.vue, is-caps): black on its pastel
     color in both themes. */
  font-weight: 500;
  font-size: 14px;
  color: var(--color-on-pastel);
  white-space: nowrap;
  /* Passes through to the image, whose hover drives the label's. */
  pointer-events: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

/* !important: the color is set inline. */
.image-label.is-hovered {
  background-color: var(--chip-deep) !important;
  color: #fff;
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

/* Below 1150px: the same composition as desktop, drawn smaller — minus
   the four corner article titles, too much at phone width. The tab, grid
   and sizes come from computeGrid's own mobile branch (script);
   the headline mask follows the smaller font on its own (it's measured). */
@media (max-width: 1150px) {
  .splash {
    --splash-image-min-width: 70px;
    --splash-image-max-width: 60vw;
  }

  /* The tab's sentence comes last, once the footer is up: it runs in from the
     tab's right edge, first word first, slowing down to its usual pace. */
  .splash.intro-tab .splash-tab-ticker,
  .splash.intro-footer .splash-tab-ticker {
    opacity: 0;
  }

  .splash.intro-logo .splash-tab-ticker-slide,
  .splash.intro-build .splash-tab-ticker-slide,
  .splash.intro-tab .splash-tab-ticker-slide,
  .splash.intro-footer .splash-tab-ticker-slide {
    animation-play-state: paused;
  }

  .splash:not(.is-leaving) .splash-tab-ticker {
    transition: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    .splash.is-measured:not(.intro-logo, .intro-build, .intro-tab, .intro-footer) .splash-tab-ticker-slide {
      animation:
        splash-tab-ticker-enter 1.4s cubic-bezier(0.16, 1, 0.3, 1) var(--ticker-enter-delay, 0s) backwards,
        splash-tab-ticker-slide 24s linear var(--ticker-enter-delay, 0s) infinite;
    }

    /* A returning visitor has no intro: after the splash's fade-in. */
    .splash.is-returning {
      --ticker-enter-delay: 0.4s;
    }
  }

  .splash-corner {
    display: none;
  }

  .splash-logo {
    font-size: 12vw;
  }

  /* Apart from the headline's frame (computeGrid, buildSentenceMasks). */
  .splash-subtitle {
    margin-top: var(--subtitle-gap, 0);
  }

  .splash-subtitle-box {
    padding: 8px 10px;
    /* The same size as the tab's sentence (.splash-tab-ticker-track). */
    font-size: 12pt;
  }

  /* Only the CMS's first line, which ends on "disinformation". */
  .splash-subtitle-rest {
    display: none;
  }

  /* Top and height come from computeGrid and placeStrip (stripStyle): in the
     grid's lower half, midway between the subtitle and the button. Every image
     stands on the strip's bottom edge. */
  .splash-images {
    height: 28vh;
  }

  .splash-images-track {
    align-items: flex-end;
  }

  /* Smaller on a phone's narrower images, so fewer words need cutting. Never as
     wide as the image: a long word ends in an ellipsis, so some of the image
     always shows beside it. */
  .image-label {
    box-sizing: border-box;
    max-width: 75%;
    padding: 1px 5px;
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
  }

  /* Scales with the screen, so its one line of text fits the narrowest phone. */
  .splash-cta {
    padding: 12px 16px;
    white-space: nowrap;
    font-size: min(12pt, 3.9vw);
  }
}
</style>
