<script setup lang="ts">
import type { KeywordRef } from '~/types/article'

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

const badgeColor = computed(() => badgeColorFor(props.index))
const { onHover, onLeave } = useArticleCardHighlight(computed(() => props.item))

// Positional, not CMS data — which cards get the small country badge, and
// which country. Index 2 (Bot/Troll Detector) sits behind its image
// instead of in the corner (see .tool-card-country-behind below). Corner
// sizes/offsets vary per card on purpose (0 bigger and pushed further
// outside the card, 1 smaller and barely cropped) — not derived from
// anything, just visual variety.
const COUNTRY_BY_INDEX: Record<number, 'CA' | 'PE' | 'BR'> = { 0: 'CA', 1: 'PE', 2: 'BR' }
const country = computed(() => COUNTRY_BY_INDEX[props.index])
const countryBehindImage = computed(() => props.index === 2)
const CORNER_SIZE_BY_INDEX: Record<number, number> = { 0: 260, 1: 130 }
const CORNER_OFFSET_BY_INDEX: Record<number, number> = { 0: 90, 1: 30 }
const cornerSize = computed(() => CORNER_SIZE_BY_INDEX[props.index])
const cornerOffset = computed(() => CORNER_OFFSET_BY_INDEX[props.index])
</script>

<template>
  <NuxtLink
    :to="`/tools/${item.slug}`"
    class="tool-card"
    :style="{ '--card-accent': badgeColor }"
    @mouseenter="onHover"
    @mouseleave="onLeave"
  >
    <div class="tool-card-image-wrap">
      <!-- Same footprint as the image (fills the wrap, including its own
           padding) and z-index below it — the image covers it almost
           entirely, except the top padding strip the image doesn't reach,
           where it reads as sliding out from behind. -->
      <CountryIcon v-if="country && countryBehindImage" :code="country" class="tool-card-country-behind" />
      <img v-if="item.image" class="no-duotone" :src="item.image.url" :alt="item.image.alt || item.title">
    </div>
    <div class="tool-card-body">
      <span class="tool-card-eyebrow">Tool {{ index + 1 }}</span>
      <h2 class="tool-card-title">{{ item.title }}</h2>
      <span v-if="item.subtitle" class="tool-card-subtitle" :style="{ backgroundColor: badgeColor }">
        {{ item.subtitle }}
      </span>
    </div>
    <!-- Over the card's own top-right corner, partly past the card's own
         edge — .tool-card's overflow:hidden crops it there on purpose. -->
    <CountryIcon
      v-if="country && !countryBehindImage"
      :code="country"
      class="tool-card-country-corner"
      :style="{
        width: `${cornerSize}px`,
        height: `${cornerSize}px`,
        top: `-${cornerOffset}px`,
        right: `-${cornerOffset}px`,
      }"
    />
  </NuxtLink>
</template>

<style scoped>
.tool-card {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  background: #b8a084;
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
  /* Opaque — this is what actually hides whatever part of
     .tool-card-country-behind sits underneath it. */
  background: #b8a084;
  transition: background-color 0.15s ease;
}

.tool-card:hover .tool-card-image-wrap {
  background: var(--card-accent);
}

/* Cover images stay full color (img.no-duotone, main.css) — the duotone
   treatment reads as archival/editorial, which doesn't suit a product
   screenshot the way it suits a photo in the guide. */
.tool-card-image-wrap img {
  /* position+z-index (not just DOM order) is what actually puts this above
     .tool-card-country-behind — a plain static img would otherwise paint
     below any position:absolute sibling regardless of DOM order. */
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Much bigger than .tool-card-image-wrap and shifted up — mask-size:contain
   scales to this box, not the wrap's, so a small size step (as tried
   first) just re-scaled the shape to barely clear the wrap's own 20px top
   padding with no actual dot content reaching that thin band. This bigger,
   higher box pushes a real row of the shape's own dots up into the
   reveal strip instead. z-index 0, below the img (z-index 1) — the only
   part actually visible is wherever the img doesn't cover, almost all of
   it along the top. */
.tool-card-country-behind {
  position: absolute;
  z-index: 0;
  top: -40%;
  left: -10%;
  width: 130%;
  height: 160%;
}

/* Width/height/offset all set inline per card (cornerSize/cornerOffset). */
.tool-card-country-corner {
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
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
  font-size: 12pt;
  text-transform: uppercase;
}

.tool-card-title {
  margin: 0;
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 500;
  font-size: 24pt;
  text-align: left;
}

/* Same treatment as the guide card's subtitle chip — tight,
   shrink-to-fit rectangle, cycling the same 3 colors by index. */
.tool-card-subtitle {
  display: inline-block;
  padding: 1px;
  color: #000;
  font-family: 'EB Garamond', Garamond, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 12pt;
}
</style>
