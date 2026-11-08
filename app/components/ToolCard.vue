<script setup lang="ts">
import type { KeywordRef } from '~/types/article'
import { cardHoverFilter, deepBadgeColor, toolColorFor } from '~/utils/badgeColors'

export interface Tool {
  title: string
  slug: string
  id: string
  subtitle?: string
  image?: { url: string, alt?: string } | null
  // Same 4 keyword pools as the guide/resource cards (tool.yml now has the
  // same keywords_section fields) — drives the hover highlight below.
  themes?: KeywordRef[]
  concepts?: KeywordRef[]
  platforms?: KeywordRef[]
  questions?: KeywordRef[]
}

const props = defineProps<{
  item: Tool
  index: number
}>()

const badgeColor = computed(() => toolColorFor(props.index))
// A photo in the site's duotone, like a guide card (main.css).
// Europe from above: NASA's Blue Marble, as on the splash.
// band: which of the photo's tones take the colour, as shares of its own pixels,
// darkest 0 to brightest 1, chosen per photo (each one's tones differ):
// - the map is a dark sea, so its brighter half (land, desert) goes coral;
// - the newspapers are mostly white paper: their brighter half (the paper) takes
//   a pale lilac, at under half strength, the ink staying light silver;
// - the phone farm's brightest 35% (walls, window) go teal.
// soft: how gradually the colour comes in (1: across the whole band).
// amount: how far into the colour the band goes (1: its full deep shade).
const TOOL_VISUALS = [
  { url: '/nasa/europe-card.jpg', width: 1200, height: 900, band: [0.5, 1], soft: 0.6, amount: 1 },
  { url: '/tool-visuals/extension.jpg', width: 900, height: 589, band: [0.5, 1], soft: 1, amount: 0.45 },
  { url: '/tool-visuals/bot.jpg', width: 720, height: 900, band: [0.65, 1], soft: 1, amount: 1 },
] as const
// /?nasa=world, /?nasa=south or /?nasa=broad: the map less centred on Europe
// (the whole world, Africa with Europe above it, or, flat, the Old World and
// Australia round the Indian Ocean), to compare; the coral band starts higher,
// above each one's larger share of sea.
const NASA_VIEWS: Record<string, { url: string, band: readonly [number, number], baked?: boolean }> = {
  world: { url: '/nasa/world-card.jpg', band: [0.75, 1] },
  south: { url: '/nasa/south-card.jpg', band: [0.65, 1] },
  // Flat (equirectangular, not Mercator), round the Indian Ocean: Africa, Asia,
  // Europe and Australia. Already in the card's silver and coral (baked: sea
  // and land parted along the coastlines, the land's relief in the coral), so
  // shown without the filter.
  broad: { url: '/nasa/broad-card.jpg', band: [0.7, 1], baked: true },
}
const nasaView = NASA_VIEWS[String(useRoute().query.nasa ?? '')]
const visual = computed(() => {
  const base = TOOL_VISUALS[props.index % TOOL_VISUALS.length]!
  return props.index % TOOL_VISUALS.length === 0 && nasaView ? { ...base, ...nasaView } : base
})

// The photo in the site's silver (app.vue's #duotone-silver, as on the splash: a
// negative, black showing near white, white showing cool grey), one band of its
// tones in the tool's colour instead (TOOL_VISUALS' band, measured on the photo
// itself), the colour coming in smoothly from the silver and deepening. One SVG
// gradient map per card, smooth by nature; hovering shows the photo as it is.
const filterId = computed(() => `tool-tint-${props.index}`)
const tableValues = ref<[string, string, string] | null>(null)
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
const mixRgb = (a: number[], b: number[], t: number) => [0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * t)
function fitFilter() {
  const image = new Image()
  image.src = visual.value.url
  image.onload = () => {
    const w = 160, h = Math.max(1, Math.round(160 * image.naturalHeight / image.naturalWidth))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(image, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    const levels: number[] = []
    for (let i = 0; i < d.length; i += 4) levels.push((0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!) / 255)
    levels.sort((x, y) => x - y)
    const at = (share: number) => levels[Math.min(levels.length - 1, Math.floor(share * levels.length))]!
    const { band: [from, to], soft, amount } = visual.value
    // The band in luminance: lo..hi, the colour easing in (and out) over `ramp`.
    const lo = from > 0 ? at(from) : 0
    const hi = to < 1 ? at(to) : at(0.99)
    const ramp = Math.max(0.06, (hi - lo) * soft)
    const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
    const deep = hexRgb(deepBadgeColor(badgeColor.value))
    const shade = mixRgb(deep, [30, 30, 32], 0.2)
    const silverAt = (v: number) => mixRgb([244, 244, 242], [159, 161, 163], v)
    const STOPS = 64
    const stops = Array.from({ length: STOPS + 1 }, (_, k) => {
      const v = k / STOPS
      const rise = from > 0 ? smooth((v - lo) / ramp) : 1
      const fall = to < 1 ? 1 - smooth((v - (hi - ramp)) / ramp) : 1
      const e = rise * fall * amount
      if (e <= 0) return silverAt(v)
      // Out of the silver, into the colour, its deep shade at the band's heart.
      const base = silverAt(Math.min(Math.max(v, lo), hi))
      return e < 0.5 ? mixRgb(base, deep, e * 2 * 0.85) : mixRgb(mixRgb(base, deep, 0.85), shade, (e - 0.5) * 2)
    })
    tableValues.value = [0, 1, 2].map((ch) => stops.map((s) => (s[ch]! / 255).toFixed(4)).join(' ')) as [string, string, string]
  }
}
onMounted(fitFilter)
// Tools 2 and 3 (purple #cdb4ea, teal #b4eae1) are too pale for the
// white eyebrow/title once the card fills with them on hover: those two
// take dark text instead (.tool-card.is-pale, below); tool 1's coral keeps
// white text.
const isPale = computed(() => props.index % BADGE_COLORS.length !== 0)
const { onHover, onLeave } = useArticleCardHighlight(computed(() => props.item))

// Expands into its tool page's right panel, and collapses back (useToolMorph).
const toolMorph = useToolMorph()
const morphStyle = computed(() => (toolMorph.value === props.item.slug ? toolMorphStyle() : undefined))
</script>

<template>
  <NuxtLink
    :to="`/tools/${item.slug}`"
    class="tool-card"
    :class="{ 'is-pale': isPale }"
    :style="[{ '--card-accent': badgeColor }, morphStyle]"
    @mouseenter="onHover"
    @mouseleave="onLeave"
  >
    <div class="tool-card-image-wrap">
      <svg v-if="tableValues" width="0" height="0" class="tool-card-filter" aria-hidden="true">
        <filter :id="filterId" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" :tableValues="tableValues[0]" />
            <feFuncG type="table" :tableValues="tableValues[1]" />
            <feFuncB type="table" :tableValues="tableValues[2]" />
          </feComponentTransfer>
        </filter>
      </svg>
      <img
        class="tool-card-img no-duotone"
        :src="visual.url"
        :width="visual.width"
        :height="visual.height"
        :alt="item.title"
        :style="{
          '--tool-filter': 'baked' in visual && visual.baked ? 'none' : tableValues ? `url(#${filterId})` : 'url(#duotone-silver)',
          '--tool-filter-hover': cardHoverFilter(badgeColor),
        }"
      >
    </div>
    <div class="tool-card-body">
      <span class="tool-card-eyebrow text-small">Tool {{ index + 1 }}</span>
      <h2 class="tool-card-title text-h2">{{ item.title }}</h2>
      <BadgeChip v-if="item.subtitle" class="tool-card-subtitle" caps :color="badgeColor">
        {{ item.subtitle }}
      </BadgeChip>
    </div>
  </NuxtLink>
</template>

<style scoped>
.tool-card {
  position: relative;
  flex: none;
  height: calc((100vh - 8.5vh - var(--footer-height) - 2px) / 3);
  min-height: 0;
  display: flex;
  background: var(--color-card);
  text-decoration: none;
  overflow: hidden;
  transition: background-color 0.15s ease;
}

/* Same color as this card's own subtitle chip (--card-accent, set inline
   from badgeColor above) — not a fixed hover tint shared by every card. */
.tool-card:hover {
  background: var(--card-accent);
}

.tool-card-image-wrap {
  position: relative;
  z-index: 1;
  flex: 0 0 40%;
  height: 100%;
  box-sizing: border-box;
  padding: 20px 5px 20px 20px;
  overflow: hidden;
}

.tool-card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* The splash's silver with the tool's colour (script, fitFilter); on hover, the
   same negative from white to a deep shade of the card's colour, as on a guide
   card (app.vue's #duotone-card-*). */
.tool-card .tool-card-img {
  filter: var(--tool-filter);
  transition: filter 0.3s ease;
}

.tool-card:hover .tool-card-img {
  filter: var(--tool-filter-hover);
}

.tool-card-filter {
  position: absolute;
}

/* justify-content:flex-end (not center) bottom-aligns the text block
   against the card's own bottom edge; padding-left is the 10px gap off
   the image's own right edge. padding-bottom matches
   .tool-card-image-wrap's own (20px) exactly — that's what lines the
   subtitle chip's own bottom edge up with the image's own bottom edge,
   since both are then inset the same amount from the shared card bottom. */
.tool-card-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 6px;
  padding: 16px 16px 20px 10px;
  box-sizing: border-box;
}

.tool-card-eyebrow {
  color: var(--color-on-fill);
}

.tool-card-title {
  margin: 0;
  color: var(--color-on-fill);
  text-align: left;
}

/* Pale accents (tools 2/3): dark text on the pale fill. */
.tool-card.is-pale:hover .tool-card-eyebrow,
.tool-card.is-pale:hover .tool-card-title {
  color: var(--color-on-pastel);
}

/* Same as a guide card's chip (GuideCard.vue). !important: BadgeChip sets its
   own color inline. */
.tool-card:hover .tool-card-subtitle {
  background-color: var(--chip-deep) !important;
  color: #fff;
}

.tool-card-eyebrow,
.tool-card-title,
.tool-card-subtitle {
  transition: color 0.15s ease, background-color 0.15s ease;
}

/* Same card shape as GuideCard.vue's own mobile layout (per the article
   reference, Articles.png) — eyebrow, title, full-width colored subtitle
   strip, then a wide landscape image, all centered, stacked full-width
   with no gaps (TemplateTools.vue's own mobile container handles that
   part) — not the desktop's 40%-image-beside-body row. `order` puts
   .tool-card-body (already eyebrow→title→subtitle in DOM order) before
   the image without touching the markup itself. */
@media (max-width: 1150px) {
  .tool-card {
    flex: none;
    flex-direction: column;
    align-items: center;
    padding: 20px 12px 15px;
  }

  .tool-card-body {
    order: 1;
    flex: none;
    width: 100%;
    align-items: center;
    padding: 0;
    gap: 0;
  }

  .tool-card-title {
    margin: 4px 0 0;
    text-align: center;
  }

  /* Full-width strip (within the card's own 12px padding), not the
     desktop's shrink-to-fit chip — overrides BadgeChip.vue's own
     display:inline-block/padding, same treatment as GuideCard.vue's own
     mobile subtitle. */
  .tool-card-subtitle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 24px;
    margin: 6px 0 0;
    padding: 0;
  }

  .tool-card-image-wrap {
    order: 2;
    flex: none;
    width: 100%;
    height: auto;
    margin-top: 11px;
    aspect-ratio: 2.6 / 1;
    padding: 0;
  }
}
</style>
