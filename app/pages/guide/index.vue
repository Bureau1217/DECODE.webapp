<script setup lang="ts">
import { pageSelects } from '~/kql/page-selects'
import type { Article } from '~/types/article'

const articles = await useKirbyCollection<Article>(
  'guide:index',
  "site.children.filterBy('intendedTemplate', 'default')",
  {
    title: true,
    slug: true,
    id: true,
    header_subtitle: true,
    header_image: {
      query: 'page.header_image.toFile',
      select: { url: true, alt: true },
    },
    themes: pageSelects.default!.themes,
    concepts: pageSelects.default!.concepts,
    platforms: pageSelects.default!.platforms,
    questions: pageSelects.default!.questions,
  },
)

// Leaving this page entirely (not just un-hovering a card) shouldn't leave
// some other article's keywords highlighted in the panel — GuideCard sets
// this on hover, but only this page knows when it's being left.
const highlighted = useHighlightedKeywords()
onUnmounted(() => {
  highlighted.value = null
})

// Arriving from the splash (useIntroTransition): the 4 cards open out of
// the grid's centre, where the white cross meets, each from its own
// inner corner, then their image settles and their text comes up.
const introTransition = useIntroTransition()
</script>

<template>
  <!-- 4 fixed quadrants, not one per article — a 5th article has nowhere
       to go yet (not asked for: pagination, or more than 4 cards). The
       white cross dividing them is the grid's own 1px gap showing through
       its white background, not separately positioned lines — that's what
       guarantees the vertical one lands exactly on the grid's own
       horizontal center and the horizontal one spans only this grid's own
       width, never the keywords panel beside it. -->
  <article class="guide-grid" :class="{ 'is-intro': introTransition }">
    <GuideCard
      v-for="(item, index) in articles?.slice(0, 4)"
      :key="item.id"
      :item="item"
      :index="index"
    />
  </article>
</template>

<style scoped>
.guide-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  background: var(--color-grid-line);
  /* Fills exactly the space between SiteNav/SiteIndexBar (8.5vh, top) and
     SiteFooter (var(--footer-height), bottom) — both fixed. Leaving the
     footer's own height out (as an earlier version did) let the bottom
     row's cards extend behind the fixed, opaque footer, permanently
     hiding whatever fell in that strip (e.g. the 4th card's own title)
     with no way to scroll it into view, unlike the keywords panel beside
     it, which actually can scroll behind the footer by design. */
  height: calc(100vh - 8.5vh - var(--footer-height));
}

/* Splash -> guide (script). The cross itself is the grid's background
   showing through its gap, so it's there from the first frame, and each
   card opens out of it. Ends well inside useIntroTransition's 2.8s, after
   which the class goes and the cards are just themselves. */
.guide-grid.is-intro :deep(.guide-card) {
  animation: guide-card-open 0.9s cubic-bezier(0.3, 0, 0.15, 1) both;
}

.guide-grid.is-intro :deep(.guide-card:nth-child(1)) {
  --card-from: inset(100% 0 0 100%);
  animation-delay: 0.45s;
}

.guide-grid.is-intro :deep(.guide-card:nth-child(2)) {
  --card-from: inset(100% 100% 0 0);
  animation-delay: 0.55s;
}

.guide-grid.is-intro :deep(.guide-card:nth-child(3)) {
  --card-from: inset(0 0 100% 100%);
  animation-delay: 0.65s;
}

.guide-grid.is-intro :deep(.guide-card:nth-child(4)) {
  --card-from: inset(0 100% 100% 0);
  animation-delay: 0.75s;
}

@keyframes guide-card-open {
  from {
    clip-path: var(--card-from);
  }

  to {
    clip-path: inset(0 0 0 0);
  }
}

.guide-grid.is-intro :deep(.guide-card-image-wrap img) {
  animation: guide-card-image-settle 1.4s cubic-bezier(0.2, 0.6, 0.3, 1) 0.6s both;
}

@keyframes guide-card-image-settle {
  from {
    transform: scale(1.12);
    opacity: 0;
  }
}

.guide-grid.is-intro :deep(.guide-card-title),
.guide-grid.is-intro :deep(.guide-card-subtitle) {
  animation: guide-card-text-up 0.7s cubic-bezier(0.2, 0.6, 0.3, 1) both;
}

.guide-grid.is-intro :deep(.guide-card-title) {
  animation-delay: 1.1s;
}

.guide-grid.is-intro :deep(.guide-card-subtitle) {
  animation-delay: 1.25s;
}

@keyframes guide-card-text-up {
  from {
    transform: translateY(14px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .guide-grid.is-intro :deep(.guide-card),
  .guide-grid.is-intro :deep(.guide-card-image-wrap img),
  .guide-grid.is-intro :deep(.guide-card-title),
  .guide-grid.is-intro :deep(.guide-card-subtitle) {
    animation: none;
  }
}

/* Stacked vertically (one full-width card per row, scrolling down), not
   side by side, and no gap between rows — a continuous editorial index,
   per the reference (Articles.png), not 4 bordered tiles. Each card's own
   height is content-driven (GuideCard.vue's own mobile layout: number,
   title, subtitle strip, a fixed-aspect-ratio image, with explicit
   spacing/padding at every step) rather than forced to fill a row here. */
@media (max-width: 768px) {
  .guide-grid {
    grid-template-columns: none;
    grid-template-rows: none;
    display: flex;
    flex-direction: column;
    gap: 0;
    height: auto;
  }

  .guide-grid :deep(.guide-card) {
    min-height: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.35);
  }

  .guide-grid :deep(.guide-card:last-child) {
    border-bottom: none;
  }
}
</style>
