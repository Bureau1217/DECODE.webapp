<script setup lang="ts">
// Pulled out of guide/index.vue so the same card can be reused with a
// different layout later (e.g. a horizontal variant for the tools page, or
// whatever the resources page needs) without duplicating the markup/styles
// — only the grid itself (.guide-grid, still in guide/index.vue) stays
// specific to that page. Shared pieces (Article shape, hover-highlight
// behavior, badge color) live in app/types and app/composables so those
// other variants pull from the same place instead of re-deriving them.
import type { Article } from '~/types/article'

const props = defineProps<{
  item: Article
  index: number
}>()

const badgeColor = computed(() => badgeColorFor(props.index))
const { onHover, onLeave } = useArticleCardHighlight(computed(() => props.item))
</script>

<template>
  <NuxtLink
    :to="`/guide/${item.id}`"
    class="guide-card"
    :style="{ '--card-accent': badgeColor }"
    @mouseenter="onHover"
    @mouseleave="onLeave"
  >
    <span class="guide-card-number">{{ index + 1 }}</span>
    <BadgeChip v-if="item.header_subtitle" class="guide-card-subtitle" :color="badgeColor">
      {{ item.header_subtitle }}
    </BadgeChip>
    <div class="guide-card-image-wrap">
      <img v-if="item.header_image" :src="item.header_image.url" :alt="item.header_image.alt || item.title">
    </div>
    <h2 class="guide-card-title">{{ item.title }}</h2>
  </NuxtLink>
</template>

<style scoped>
.guide-card {
  background: var(--color-brand-resources);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  /* Centers the number + subtitle chip (both shrink-to-fit width) and the
     image (see below) horizontally, without needing their own margin:auto. */
  align-items: center;
  box-sizing: border-box;
  /* 10% frames the image on its 3 free sides; the 4th (bottom) is
     exactly 10px so the title — the flex column's last item — lands
     exactly 10px off the card's own bottom edge, not a percentage of it. */
  padding: 5% 5% 5px;
  overflow: hidden;
  transition: background-color 0.15s ease;
}

/* Same color as this card's own subtitle chip (--card-accent, set inline
   from badgeColor above) — not a fixed hover tint shared by every card. */
.guide-card:hover {
  background: var(--card-accent);
}

.guide-card-number {
  color: var(--color-surface);
  font-family: var(--font-serif);
  font-size: 28px;
  line-height: 1;
}

.guide-card-image-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* aspect-ratio (not the wrapper's own box) is what guarantees the
   "vertical" portrait look regardless of the quadrant's own raw
   proportions — max-width/height:100% then fits it to whichever axis
   the flex-available space constrains first. */
/* height:100% (not max-height) is what reliably fills the flex-sized
   wrapper — max-height left the image sizing itself off its own intrinsic
   dimensions first in some cases, growing taller than the card actually
   had room for and pushing the title below the card's own visible/clipped
   bounds. width:auto + aspect-ratio derives the portrait width from that
   resolved height; max-width is just a safety cap for an unusually
   short/wide card. */
.guide-card-image-wrap img {
  height: 100%;
  width: 80%;
  max-width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  display: block;
}

/* Chip look itself lives in BadgeChip.vue now — only this card's own
   spacing/alignment stays here. */
.guide-card-subtitle {
  margin: 6px 0;
  text-align: center;
}

.guide-card-title {
  font-size: 24pt;
  margin: 10px 0 0;
  text-align: center;
  color: var(--color-surface);
  font-family: var(--font-serif);
  font-weight: 500;
}

/* Per the reference (Articles.png): number → title → colored subtitle
   strip → wide landscape image, all centered, stacked tightly — not the
   desktop's number/badge/image/title order (`order` below reshuffles
   that without touching the markup) and not a portrait image either.
   guide/index.vue's own mobile grid stacks these cards full-width one
   per row (scrolling down); each card's own height is content-driven
   here (guide/index.vue sets height:auto), not forced to fill a row. */
@media (max-width: 768px) {
  .guide-card {
    flex-direction: column;
    align-items: center;
    padding: 20px 12px 15px;
  }

  .guide-card-number {
    order: 1;
    font-size: 26px;
  }

  .guide-card-title {
    order: 2;
    margin: 4px 0 0;
    font-size: 28px;
  }

  /* Full-width strip (within the card's own 12px padding), not the
     desktop's shrink-to-fit chip — overrides BadgeChip.vue's own
     display:inline-block/padding so the color fills a fixed-height band
     instead of hugging the text. */
  .guide-card-subtitle {
    order: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 20px;
    margin: 6px 0 0;
    padding: 0;
    font-size: 16px;
  }

  .guide-card-image-wrap {
    order: 4;
    flex: none;
    width: 100%;
    height: auto;
    margin-top: 11px;
    aspect-ratio: 2.6 / 1;
  }

  /* Fills the wide landscape box (aspect-ratio set on the wrap, above),
     not the desktop's own portrait 4/5 crop. */
  .guide-card-image-wrap img {
    width: 100%;
    height: 100%;
    max-width: none;
    aspect-ratio: auto;
  }
}
</style>
