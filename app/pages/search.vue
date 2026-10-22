<script setup lang="ts">
import { searchDocs } from '~/composables/useSiteSearch'

// Results for SiteIndexBar's SEARCH field (Enter -> /search?q=…), in the
// right half beside the keywords panel. Left column: the word found —
// exactly what was typed first, then related spellings further down.
// Right column: every page it appears in.
const route = useRoute()
const query = computed(() => String(route.query.q ?? '').trim())

const { data: docs, status } = useSearchCorpus()
const groups = computed(() => (docs.value ? searchDocs(docs.value, query.value) : []))

const language = useLanguage()
const copy = computed(() => (language.value === 'fr'
  ? { searching: 'Recherche…', none: 'Aucun résultat pour', for: 'résultats pour', in: 'dans' }
  : { searching: 'Searching…', none: 'No results for', for: 'results for', in: 'in' }))

const pageCount = computed(() => new Set(groups.value.flatMap((g) => g.hits.map((h) => h.doc.key))).size)

function wordParts(word: string, match?: [number, number]) {
  if (!match) return { before: word, hit: '', after: '' }
  return { before: word.slice(0, match[0]), hit: word.slice(match[0], match[1]), after: word.slice(match[1]) }
}

// Started from a tool (useToolTheme): bands, rules and hover in its colors.
const { theme } = useToolTheme()
const themeVars = computed(() => (theme.value
  ? { '--search-band': theme.value.chromeAccent, '--search-line': theme.value.chromeText }
  : undefined))

useHead({ title: () => (query.value ? `${query.value} — Search` : 'Search') })
</script>

<template>
  <section class="search-results" :style="themeVars">
    <p class="search-summary">
      <template v-if="status === 'pending' || status === 'idle'">{{ copy.searching }}</template>
      <template v-else-if="!groups.length">{{ copy.none }} “{{ query }}”</template>
      <template v-else>{{ pageCount }} {{ copy.for }} “{{ query }}”</template>
    </p>

    <ol class="search-groups">
      <li v-for="group in groups" :key="group.word" class="search-group" :class="`is-score-${group.score}`">
        <p class="search-word">
          <span>{{ wordParts(group.word, group.match).before }}</span><mark>{{ wordParts(group.word, group.match).hit }}</mark><span>{{ wordParts(group.word, group.match).after }}</span>
        </p>
        <ul class="search-hits">
          <li v-for="hit in group.hits" :key="hit.doc.key">
            <NuxtLink :to="hit.doc.to" class="search-hit">
              <span class="search-hit-title">
                {{ hit.doc.title }}
                <span v-if="hit.doc.context" class="search-hit-context">{{ copy.in }} {{ hit.doc.context }}</span>
              </span>
              <span v-if="hit.doc.kind" class="search-hit-kind">{{ hit.doc.kind }}</span>
            </NuxtLink>
          </li>
        </ul>
      </li>
    </ol>
  </section>
</template>

<style scoped>
/* Brown rules between every word and every page — a tool's own colors
   when the search started on one. */
.search-results {
  --search-band: var(--color-brand-resources);
  --search-line: var(--color-brand);
  min-height: 100%;
  box-sizing: border-box;
  background: var(--color-surface);
  color: var(--search-line);
  /* The footer is fixed over the bottom of this scroll area: room to
     scroll the last row clear of it. */
  padding-bottom: calc(var(--footer-height) + 26px);
}

.search-summary {
  /* "N results for …": lined up with the keywords panel's CONCEPTS/
     PLATFORMS… headers beside it (KeywordsPanel.vue's h3) — same height,
     same type — on white. Stays put while the results scroll under it. */
  position: sticky;
  top: 0;
  z-index: 1;
  box-sizing: border-box;
  margin: 0;
  height: 30px;
  padding-left: 10px;
  display: flex;
  align-items: center;
  background: var(--color-surface);
  color: var(--search-line);
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 12pt;
  text-transform: uppercase;
  border-bottom: 1px solid var(--search-line);
}

.search-groups {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Word on the left, the pages it's in on the right. */
.search-group {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  border-bottom: 1px solid var(--search-line);
}

.search-word {
  /* Stays in view under the results band while a long list of its pages
     scrolls by. */
  position: sticky;
  top: 30px;
  align-self: start;
  margin: 0;
  padding: 12px 16px;
  font-family: var(--font-serif);
  font-size: 18pt;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.search-group.is-score-3 .search-word {
  font-style: italic;
}

.search-word mark {
  background: none;
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.15em;
}

.search-hits {
  list-style: none;
  margin: 0;
  padding: 0;
  /* The pages share the group's full height (the word beside them can be
     taller), so each one's hover fills its stripe to the rule. The
     column rule is drawn here, not on the (sticky, shorter) word. */
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--search-line);
}

.search-hits li {
  flex: 1 1 auto;
  display: flex;
}

.search-hits li + li {
  border-top: 1px solid var(--search-line);
}

/* Same hover as a resource card (ResourceCard.vue). */
.search-hit {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: var(--color-brand-resources);
  transition: background-color 0.15s ease;
}

.search-hit:hover {
  background-color: var(--color-hover-tint);
}

.search-hit:hover .search-hit-title {
  color: var(--color-brand-about);
}

.search-hit-title {
  font-family: var(--font-serif);
  font-size: 14pt;
  line-height: 1.25;
}

.search-hit-context {
  font-style: italic;
}

.search-hit-kind {
  flex-shrink: 0;
  padding: 2px 4px;
  background: var(--search-band);
  color: var(--color-on-fill);
  font-family: var(--font-mono);
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

@media (max-width: 768px) {
  .search-group {
    grid-template-columns: minmax(0, 1fr);
  }

  .search-word {
    position: static;
    border-bottom: 1px solid var(--search-line);
  }

  .search-hits {
    border-left: none;
  }
}
</style>
