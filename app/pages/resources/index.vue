<script setup lang="ts">
import { pageSelects } from '~/kql/page-selects'
import type { ResourceItem } from '~/components/ResourceCard.vue'

// Flattened across every theme (articles/papers/podcasts/videos — each a
// `ressources` page, DECODE.cms/content/<theme>/) rather than listing the
// themes themselves: `site.index` is every descendant regardless of depth,
// filtered down to just the `ressource` leaves. `page.parent.title` is
// each item's "type" badge — the CMS has no separate type field, the theme
// page's own title doubles as it.
const items = await useKirbyCollection<ResourceItem>(
  'resources:index',
  "site.index.filterBy('intendedTemplate', 'ressource')",
  {
    title: true,
    id: true,
    authors: true,
    type: 'page.parent.title',
    // ressource.yml now has the same keywords_section fields as
    // default.yml (same field names/queries) — reusing pageSelects.default
    // here rather than redeclaring the toPages query.
    themes: pageSelects.default!.themes,
    concepts: pageSelects.default!.concepts,
    platforms: pageSelects.default!.platforms,
    questions: pageSelects.default!.questions,
  },
)

// Leaving this page shouldn't leave some other item's keywords highlighted
// in the panel — same reasoning as guide/index.vue.
const highlighted = useHighlightedKeywords()
onUnmounted(() => {
  highlighted.value = null
})
</script>

<template>
  <!-- 12 fixed slots (4 rows of 3), same "fixed grid, not everything the
       CMS has" approach as the guide grid — more items just don't show
       here yet rather than growing the page unboundedly. -->
  <article class="resources-grid">
    <ResourceCard v-for="item in items?.slice(0, 12)" :key="item.id" :item="item" />
  </article>
</template>

<style scoped>
.resources-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* Closes the grid's outer box on the sides ResourceCard's own top+left
     borders don't reach (last column/row have no card past them to draw
     those edges). */
  border-right: 1px solid #b8a084;
  border-bottom: 1px solid #b8a084;
}

/* The grid's left edge sits against KeywordsPanel — no stroke there. Only
   the first column's own left border (ResourceCard) needs removing; every
   other edge is still exactly one line (see ResourceCard's own comment). */
.resources-grid :deep(.resource-card:nth-child(3n + 1)) {
  border-left: none;
}
</style>
