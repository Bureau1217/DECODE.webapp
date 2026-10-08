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
</script>

<template>
  <!-- 4 fixed quadrants, not one per article — a 5th article has nowhere
       to go yet (not asked for: pagination, or more than 4 cards). The
       white cross dividing them is the grid's own 1px gap showing through
       its white background, not separately positioned lines — that's what
       guarantees the vertical one lands exactly on the grid's own
       horizontal center and the horizontal one spans only this grid's own
       width, never the keywords panel beside it. -->
  <article class="guide-grid">
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
  background: #fff;
  /* Fills exactly the space between SiteNav/SiteIndexBar (8.5vh, top) and
     SiteFooter (var(--footer-height), bottom) — both fixed. Leaving the
     footer's own height out (as an earlier version did) let the bottom
     row's cards extend behind the fixed, opaque footer, permanently
     hiding whatever fell in that strip (e.g. the 4th card's own title)
     with no way to scroll it into view, unlike the keywords panel beside
     it, which actually can scroll behind the footer by design. */
  height: calc(100vh - 8.5vh - var(--footer-height));
}
</style>
