<script setup lang="ts">
import { pageSelects } from '~/kql/page-selects'
import type { ResourceItem } from '~/components/ResourceCard.vue'

// Flattened across every theme (articles/papers/podcasts/videos — each a
// `ressources` page, DECODE.cms/content/<theme>/) rather than listing the
// themes themselves: `site.index` is every descendant regardless of depth,
// filtered down to just the `ressource` leaves. `page.parent.title` is
// each item's "type" badge — the CMS has no separate type field, the theme
// page's own title doubles as it.
const items = await useKirbyCollection<ResourceItem & { category: string }>(
  'resources:index',
  "site.index.filterBy('intendedTemplate', 'ressource')",
  {
    title: true,
    id: true,
    authors: true,
    type: 'page.parent.title',
    // The type's own page slug (articles, papers, …): the filter's key in the URL (?type=papers), the same in both languages.
    category: 'page.parent.slug',
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
usePageSeo({
  title: 'Resources',
  description: 'Articles, papers, podcasts and videos to understand disinformation, selected by DE.CO.DE.',
})

const highlighted = useHighlightedKeywords()
onUnmounted(() => {
  highlighted.value = null
})
const language = useLanguage()

// Filter by type: one button per type that has published resources, in the
// CMS's own order (site.index walks the types in order). The choice lives in
// the URL (?type=papers) so a filtered list can be shared and survives a
// reload; an unknown type shows everything.
const route = useRoute()
const router = useRouter()
const categories = computed(() => {
  const seen = new Map<string, { slug: string, label: string, count: number }>()
  for (const item of items.value ?? []) {
    const c = seen.get(item.category) ?? { slug: item.category, label: item.type, count: 0 }
    c.count++
    seen.set(item.category, c)
  }
  return [...seen.values()]
})
const activeCategory = computed(() => {
  const q = route.query.type
  return typeof q === 'string' && categories.value.some((c) => c.slug === q) ? q : null
})
const shown = computed(() => (items.value ?? []).filter((item) => !activeCategory.value || item.category === activeCategory.value))
function selectCategory(slug: string | null) {
  router.replace({ query: { ...route.query, type: slug && slug !== activeCategory.value ? slug : undefined } })
}
</script>

<template>
  <!-- Every published resource (the grid grows with them), filtered by
       type from the row above it. -->
  <div class="page-with-heading">
    <h1 class="visually-hidden">{{ language === 'fr' ? 'Ressources' : 'Resources' }}</h1>
    <nav v-if="categories.length > 1" class="resources-filter" :aria-label="language === 'fr' ? 'Filtrer par type' : 'Filter by type'">
      <button
        type="button"
        class="resources-filter-btn text-label"
        :class="{ active: !activeCategory }"
        :aria-pressed="!activeCategory"
        @click="selectCategory(null)"
      >
        {{ language === 'fr' ? 'Tout' : 'All' }} <span class="resources-filter-count">{{ items?.length ?? 0 }}</span>
      </button>
      <button
        v-for="c in categories"
        :key="c.slug"
        type="button"
        class="resources-filter-btn text-label"
        :class="{ active: activeCategory === c.slug }"
        :aria-pressed="activeCategory === c.slug"
        @click="selectCategory(c.slug)"
      >
        {{ c.label }} <span class="resources-filter-count">{{ c.count }}</span>
      </button>
    </nav>
    <article class="resources-grid">
      <ResourceCard v-for="item in shown" :key="item.id" :item="item" />
    </article>
  </div>
</template>

<style scoped>
/* The types, flush against each other above the grid: stroke-only at
   rest, filled once chosen (the About page's tabs, TemplateAbout.vue, in
   the resources' own brown). No bottom stroke of its own: the first row
   of cards draws that line. */
.resources-filter {
  display: flex;
  flex-wrap: wrap;
  border-right: 1px solid var(--color-brand-resources);
}

.resources-filter-btn {
  appearance: none;
  flex: 1 1 0;
  background: var(--color-surface);
  color: var(--color-brand-resources);
  border: 0;
  border-left: 1px solid var(--color-brand-resources);
  border-radius: 0;
  padding: 12px 16px;
  cursor: pointer;
  white-space: nowrap;
}

.resources-filter-btn:first-child {
  border-left: none;
}

.resources-filter-btn:hover {
  background: color-mix(in srgb, var(--color-brand-resources) 18%, var(--color-surface));
}

.resources-filter-btn.active {
  background: var(--color-brand-resources);
  color: var(--color-surface);
}

.resources-filter-count {
  opacity: 0.6;
  margin-left: 0.4em;
}

.resources-grid {
  display: grid;
  /* minmax(0, 1fr) — see the mobile override below for why; on desktop
     too since ResourceCard's titles became single-line (nowrap), which
     would otherwise widen a column to fit the longest title. */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  /* Closes the grid's outer box on the sides ResourceCard's own top+left
     borders don't reach (last column/row have no card past them to draw
     those edges). */
  border-right: 1px solid var(--color-brand-resources);
  border-bottom: 1px solid var(--color-brand-resources);
}

/* The grid's left edge sits against KeywordsPanel — no stroke there. Only
   the first column's own left border (ResourceCard) needs removing; every
   other edge is still exactly one line (see ResourceCard's own comment). */
.resources-grid :deep(.resource-card:nth-child(3n + 1)) {
  border-left: none;
}

/* 2 columns, not 3 (Articles.png/Ressources.png's own mobile mockups) —
   the first-column border-removal rule needs a matching nth-child(2n+1)
   override, or a 3rd/5th/... card (no longer actually first-column at 2
   columns) would wrongly keep losing its left border. */
@media (max-width: 1150px) {
  /* minmax(0, 1fr), not a bare 1fr — a grid track's implicit min-width is
     auto (its content's own min intrinsic width) unless told otherwise,
     which can force a column wider than an even 50/50 split if any card's
     own text can't wrap below that width, pushing the 2-card row past the
     viewport's own edge instead of exactly filling it. */
  .resources-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resources-grid :deep(.resource-card:nth-child(3n + 1)) {
    border-left: 1px solid var(--color-brand-resources);
  }

  .resources-grid :deep(.resource-card:nth-child(2n + 1)) {
    border-left: none;
  }

  /* The type filter's own line under it: the first row's cards drop
     theirs (below). */
  .resources-filter {
    border-bottom: 1px solid var(--color-brand-resources);
  }

  .resources-filter-btn {
    padding: 10px 8px;
  }

  /* First row sits right under the index bar's own bottom rule — its
     top strokes would double that line. */
  .resources-grid :deep(.resource-card:nth-child(-n + 2)) {
    border-top: none;
  }
}
</style>
