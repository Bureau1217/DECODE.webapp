<script setup lang="ts">
import type { KeywordRef } from '~/types/article'
import { toolColorFor } from '~/utils/badgeColors'

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
// Tools 2 and 3 (purple #cdb4ea, teal #b4eae1) are too pale for the
// white eyebrow/title once the card fills with them on hover — and the
// subtitle chip, the same color, would vanish into the card. Those two
// invert on hover instead (.tool-card.is-pale, below); tool 1's coral
// keeps white text.
const isPale = computed(() => props.index % BADGE_COLORS.length !== 0)
const { onHover, onLeave } = useArticleCardHighlight(computed(() => props.item))

// Its tool page closing back into it (useToolCloseTransition).
const toolClosing = useToolClosing()
const closeStyle = computed(() => (toolClosing.value === props.item.slug ? toolCardStyle(props.item.slug) : undefined))

// Positional, not CMS data — which cards get the small country badge, and
// which country, at its own size and spot (not derived from anything,
// just visual variety): 0 big and pushed out past the top-right corner,
// 1 smaller and further in from the right edge, both over the card and
// cropped by its edges; 2 behind its image, peeking out above and beside
// it.
const COUNTRY_BY_INDEX: Record<number, 'CA' | 'PE' | 'BR'> = { 0: 'CA', 1: 'PE', 2: 'BR' }
const country = computed(() => COUNTRY_BY_INDEX[props.index])
const COUNTRY_STYLE_BY_INDEX: Record<number, Record<string, string>> = {
  0: { width: '260px', height: '260px', top: '-90px', right: '-90px' },
  1: { width: '110px', height: '110px', top: '-6px', right: '24px' },
  2: { width: '170px', height: '170px', top: '-70px', left: 'calc(40% - 150px)' },
}
const countryStyle = computed(() => COUNTRY_STYLE_BY_INDEX[props.index])
const countryBehindImage = computed(() => props.index === 2)
</script>

<template>
  <NuxtLink
    :to="`/tools/${item.slug}`"
    class="tool-card"
    :class="{ 'is-pale': isPale }"
    :style="[{ '--card-accent': badgeColor }, closeStyle]"
    @mouseenter="onHover"
    @mouseleave="onLeave"
  >
    <div class="tool-card-image-wrap">
      <img v-if="item.image" class="no-duotone" :src="item.image.url" :alt="item.image.alt || item.title">
    </div>
    <div class="tool-card-body">
      <span class="tool-card-eyebrow text-small">Tool {{ index + 1 }}</span>
      <h2 class="tool-card-title text-h2">{{ item.title }}</h2>
      <BadgeChip v-if="item.subtitle" class="tool-card-subtitle" :color="badgeColor">
        {{ item.subtitle }}
      </BadgeChip>
    </div>
    <!-- Over the card's top edge, partly past it — .tool-card's
         overflow:hidden crops it there on purpose. -->
    <CountryIcon
      v-if="country"
      :code="country"
      class="tool-card-country"
      :class="{ 'is-behind': countryBehindImage }"
      :style="countryStyle"
    />
  </NuxtLink>
</template>

<style scoped>
.tool-card {
  position: relative;
  flex: 1 1 0;
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

/* Cover images stay full color (img.no-duotone, main.css) — the duotone
   treatment reads as archival/editorial, which doesn't suit a product
   screenshot the way it suits a photo in the guide. */
.tool-card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Size/position set inline per card (countryStyle). Above the image
   (z-index 1) — or below it (.is-behind), showing only where the image
   doesn't cover it. */
.tool-card-country {
  position: absolute;
  z-index: 2;
}

.tool-card-country.is-behind {
  z-index: 0;
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

/* Pale accents (tools 2/3): dark text on the pale fill, and the subtitle
   chip flips to dark with the accent as its text — the inverse of its
   resting pastel-chip-with-ink-text. */
.tool-card.is-pale:hover .tool-card-eyebrow,
.tool-card.is-pale:hover .tool-card-title {
  color: var(--color-on-pastel);
}

/* !important: BadgeChip sets its own background inline. */
.tool-card.is-pale:hover .tool-card-subtitle {
  background-color: var(--color-on-pastel) !important;
  color: var(--card-accent);
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
@media (max-width: 768px) {
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
    height: 20px;
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

  /* Fills the wide landscape box (aspect-ratio set on the wrap, above). */
  .tool-card-image-wrap img {
    width: 100%;
    height: 100%;
  }

  /* The corner-badge country icons assume a wide desktop card — scaled
     down rather than hidden, so the card still reads as "about a place"
     at this width without the icon swamping it. */
  .tool-card-country {
    width: 90px !important;
    height: 90px !important;
    top: -30px !important;
    right: -30px !important;
    left: auto !important;
  }
}
</style>
