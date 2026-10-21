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

// Opening the article (and closing back into this card): see
// useSharedTransition.
const { style: sharedPart, open } = useCardTransition(() => props.item.id, () => `/guide/${props.item.id}`)
</script>

<template>
  <NuxtLink
    :to="`/guide/${item.id}`"
    class="guide-card"
    :style="{ '--card-accent': badgeColor }"
    @click.capture="open"
    @mouseenter="onHover"
    @mouseleave="onLeave"
  >
    <div class="guide-card-image-wrap">
      <img v-if="item.header_image" :src="item.header_image.url" :alt="item.header_image.alt || item.title" :style="sharedPart('image')">
    </div>
    <h2 class="guide-card-title" :style="sharedPart('title')">{{ item.title }}</h2>
    <!-- Under the title, same order as on the opened article
         (TemplateDefault.vue), so the opening morph never crosses them. -->
    <BadgeChip v-if="item.header_subtitle" class="guide-card-subtitle" :color="badgeColor" :style="sharedPart('subtitle')">
      {{ item.header_subtitle }}
    </BadgeChip>
  </NuxtLink>
</template>

<style scoped>
.guide-card {
  background: var(--color-card);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  /* Centers the number + subtitle chip (both shrink-to-fit width) and the
     image (see below) horizontally, without needing their own margin:auto. */
  align-items: center;
  box-sizing: border-box;
  /* One margin everywhere — 5.5% of the card's width (padding % resolves
     against the grid cell, i.e. the card's own width): top, both sides,
     under the subtitle, and between image and title (see
     .guide-card-title). The image takes whatever height is left. */
  padding: 5.5%;
  overflow: hidden;
  transition: background-color 0.15s ease;
}

/* Same color as this card's own subtitle chip (--card-accent, set inline
   from badgeColor above) — not a fixed hover tint shared by every card. */
.guide-card:hover {
  background: var(--card-accent);
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

/* Fills the whole space the card's margins leave (cropped, not
   stretched) — its ratio follows the card rather than being fixed. */
.guide-card-image-wrap img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  display: block;
}

/* Chip look itself lives in BadgeChip.vue now — only this card's own
   spacing/alignment stays here. */
.guide-card-subtitle {
  margin: 6px 0 0;
  text-align: center;
}

.guide-card-title {
  font-size: 24pt;
  /* Same 5.5%-of-card gap as the card's own padding: a child's margin %
     resolves against the card's content box (89% of the card), hence
     5.5 / 0.89. */
  margin: 6.18% 0 0;
  line-height: 1.1;
  text-align: center;
  color: var(--color-on-fill);
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
