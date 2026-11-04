<script setup lang="ts">
import { imageSelect, pageSelects } from '~/kql/page-selects'
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
      select: imageSelect,
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

// Arriving from the splash (useIntroTransition): the 4 cards grow out of
// their own centres, their image likewise just after, then their text comes
// up. No hover on them for a moment after that (useIntroHoverLock).
const introTransition = useIntroTransition()
const hoverLocked = useIntroHoverLock()
const language = useLanguage()

usePageSeo({
  title: 'Investigation Guide',
  description: 'Articles and case studies to investigate disinformation: concepts, platforms, campaigns, trolls, deepfakes and how to verify online content.',
})
</script>

<template>
  <!-- 4 fixed quadrants, not one per article — a 5th article has nowhere
       to go yet (not asked for: pagination, or more than 4 cards). The
       white cross dividing them is the grid's own 1px gap showing through
       its white background, not separately positioned lines — that's what
       guarantees the vertical one lands exactly on the grid's own
       horizontal center and the horizontal one spans only this grid's own
       width, never the keywords panel beside it. -->
  <div class="page-with-heading">
  <h1 class="visually-hidden">{{ language === 'fr' ? 'Guide d\'enquête' : 'Investigation Guide' }}</h1>
  <article class="guide-grid" :class="{ 'is-intro': introTransition, 'is-hover-locked': hoverLocked }">
    <GuideCard
      v-for="(item, index) in articles"
      :key="item.id"
      :item="item"
      :index="index"
    />
  </article>
  </div>
</template>

<style scoped>
.guide-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  /* Two rows that exactly fill the screen, footer included; only a 5th article and
     on adds rows, and so scrolling. */
  --guide-row: calc((100vh - 8.5vh - var(--footer-height) - 1px) / 2);
  grid-template-rows: repeat(2, var(--guide-row));
  grid-auto-rows: var(--guide-row);
  gap: 1px;
  background: var(--color-grid-line);
  /* Fills exactly the space between SiteNav/SiteIndexBar (8.5vh, top) and
     SiteFooter (var(--footer-height), bottom) — both fixed. Leaving the
     footer's own height out (as an earlier version did) let the bottom
     row's cards extend behind the fixed, opaque footer, permanently
     hiding whatever fell in that strip (e.g. the 4th card's own title)
     with no way to scroll it into view, unlike the keywords panel beside
     it, which actually can scroll behind the footer by design. */
}

/* Splash -> guide (script). The cross itself is the grid's background
   showing through its gap, so it's there from the first frame, and each
   card opens out of it. Ends well inside useIntroTransition's 2.8s, after
   which the class goes and the cards are just themselves. */
.guide-grid.is-intro :deep(.guide-card) {
  animation: guide-card-open 0.9s cubic-bezier(0.3, 0, 0.15, 1) var(--card-delay) both;
}

.guide-grid.is-intro :deep(.guide-card:nth-child(1)) {
  --card-delay: 0.45s;
}

.guide-grid.is-intro :deep(.guide-card:nth-child(2)) {
  --card-delay: 0.55s;
}

.guide-grid.is-intro :deep(.guide-card:nth-child(3)) {
  --card-delay: 0.65s;
}

.guide-grid.is-intro :deep(.guide-card:nth-child(4)) {
  --card-delay: 0.75s;
}

@keyframes guide-card-open {
  from {
    clip-path: inset(50% 50% 50% 50%);
  }

  to {
    clip-path: inset(0 0 0 0);
  }
}

.guide-grid.is-intro :deep(.guide-card-image-wrap img) {
  animation: guide-card-open 0.9s cubic-bezier(0.3, 0, 0.15, 1) calc(var(--card-delay) + 0.2s) both;
}

@media (hover: hover) {
  .guide-grid.is-hover-locked :deep(.guide-card) {
    pointer-events: none;
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
@media (max-width: 1150px) {
  .guide-grid {
    grid-template-columns: none;
    grid-template-rows: none;
    grid-auto-rows: auto;
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

  /* Splash -> guide: one after the other from the top of the list. */
  .guide-grid.is-intro :deep(.guide-card:nth-child(1)) {
    --card-delay: 0.25s;
  }

  .guide-grid.is-intro :deep(.guide-card:nth-child(2)) {
    --card-delay: 0.45s;
  }

  .guide-grid.is-intro :deep(.guide-card:nth-child(3)) {
    --card-delay: 0.65s;
  }

  .guide-grid.is-intro :deep(.guide-card:nth-child(4)) {
    --card-delay: 0.85s;
  }
}
</style>
