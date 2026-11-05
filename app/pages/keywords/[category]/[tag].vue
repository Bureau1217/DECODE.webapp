<script setup lang="ts">
import { pageSelects } from '~/kql/page-selects'

const route = useRoute()
const category = assertSafeKirbyId(String(route.params.category))
const slug = assertSafeKirbyId(String(route.params.tag))
const id = `${category}/${slug}`

const page = await useKirbyPage(`keywords:${id}`, `page('${id}')`, 'tag', { exact: true })

// The title says what kind of page it is: "Astroturfing" alone would be the same
// as the guide's case study of that name, and "Filter bubble" is both a concept and
// a theme. A question says so itself.
const language = useLanguage()
const seoTitle = () => {
  const title = cmsText(page.value, 'title')
  if (!title || category === 'question') return title
  const fr = language.value === 'fr'
  if (category === 'concepts') return fr ? `${title} : définition` : `${title}: definition`
  return fr ? `${title} et désinformation` : `${title} and disinformation`
}
usePageSeo({
  title: seoTitle,
  description: () => cmsText(page.value, 'description'),
  image: () => cmsImage(page.value, 'image'),
})

// Previous/Next within its category, in the keywords panel's own order.
const categories = await useKeywordsPanelCategories()
const group = computed(() => categories.value?.find((c) => c.id === category))
const siblings = computed(() => group.value?.tags ?? [])
const position = computed(() => siblings.value.findIndex((tag) => tag.id === id))
useBreadcrumbJsonLd(() => [
  [language.value === 'fr' ? 'Mots-clés' : 'Keywords', '/keywords'],
  [group.value?.title ?? category, `/keywords/${category}`],
  [cmsText(page.value, 'title') ?? slug, route.path],
])

// What on the site carries this keyword: articles and case studies, then resources.
type Tagged = { id: string, title: string } & Partial<Record<'themes' | 'concepts' | 'platforms' | 'questions', { id: string }[]>>
const taggedSelect = {
  id: true,
  title: true,
  themes: pageSelects.default!.themes,
  concepts: pageSelects.default!.concepts,
  platforms: pageSelects.default!.platforms,
  questions: pageSelects.default!.questions,
}
const [taggedArticles, taggedResources] = await Promise.all([
  useKirbyCollection<Tagged>('keywords:tagged-articles', "site.index.filterBy('intendedTemplate', 'default')", taggedSelect),
  useKirbyCollection<Tagged>('keywords:tagged-resources', "site.index.filterBy('intendedTemplate', 'ressource')", taggedSelect),
])
const carriesKeyword = (item: Tagged) => (['themes', 'concepts', 'platforms', 'questions'] as const).some((pool) => item[pool]?.some((keyword) => keyword.id === id))
const relatedArticles = computed(() => (taggedArticles.value ?? []).filter(carriesKeyword).map((item) => ({ title: item.title, to: `/guide/${item.id}` })))
const relatedResources = computed(() => (taggedResources.value ?? []).filter(carriesKeyword).slice(0, 8).map((item) => ({ title: item.title, to: `/resources/${item.id}` })))
const prevTo = computed(() => {
  const prev = position.value > 0 ? siblings.value[position.value - 1] : null
  return prev ? `/keywords/${prev.id}` : null
})
const nextTo = computed(() => {
  const next = position.value !== -1 ? siblings.value[position.value + 1] : null
  return next ? `/keywords/${next.id}` : null
})

// The close cross goes back to the page the keyword was opened from, however
// many keywords were browsed since. A direct visit has none: the guide.
const origin = useState('keyword-origin', () => '/guide')
if (import.meta.client) {
  const back = useRouter().options.history.state.back
  if (typeof back === 'string' && !back.startsWith('/keywords')) origin.value = back
}
</script>

<template>
  <TemplateTag :page="page" :id="id" :category="group?.title" :close-to="origin" :prev-to="prevTo" :next-to="nextTo" :related-articles="relatedArticles" :related-resources="relatedResources" />
</template>
