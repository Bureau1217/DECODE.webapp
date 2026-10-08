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
    <span v-if="item.header_subtitle" class="guide-card-subtitle" :style="{ backgroundColor: badgeColor }">
      {{ item.header_subtitle }}
    </span>
    <div class="guide-card-image-wrap">
      <img v-if="item.header_image" :src="item.header_image.url" :alt="item.header_image.alt || item.title">
    </div>
    <h2 class="guide-card-title">{{ item.title }}</h2>
  </NuxtLink>
</template>

<style scoped>
.guide-card {
  background: #b8a084;
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
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
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

/* display:inline-block (not the earlier position:absolute) is what makes
   this genuinely shrink-to-fit around the text — an absolutely positioned
   block with only `left` set computes its width via shrink-to-fit too,
   but for wrapping text that algorithm tends to land close to the
   available width rather than the text's own rendered width, which read
   as "loose" rather than tight. */
.guide-card-subtitle {
  display: inline-block;
  margin: 6px 0;
  padding: 1px;
  color: #000;
  text-align: center;
  font-family: 'EB Garamond', Garamond, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 12pt;
}

.guide-card-title {
  font-size: 24pt;
  margin: 10px 0 0;
  text-align: center;
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 500;
}
</style>
