<script setup lang="ts">
import { pageSelects } from '~/kql/page-selects'

// Every page under /guide is a `default` article (possibly nested — see
// `subpages` in page-selects.ts). `default` pages live at the root of the
// Kirby content tree with no `guide` prefix, so the full param path IS
// the Kirby id — `guide` only exists as a URL namespace in Nuxt.
const route = useRoute()
const segments = Array.isArray(route.params.slug) ? route.params.slug : []
const id = assertSafeKirbyId(segments.join('/'))

const page = await useKirbyPage(`guide:${id}`, `page('${id}')`, 'default', { exact: true })

// The article's own opening text: says far more than its short subtitle.
const description = computed(() => {
  const blocks = (page.value.content ?? []) as { type?: string, isHidden?: boolean, content?: { text?: string } }[]
  const opening = blocks.find((block) => !block.isHidden && block.type === 'text' && block.content?.text)
  return opening?.content?.text ?? cmsText(page.value, 'header_subtitle')
})
const image = () => cmsImage(page.value, 'page_image_preview') ?? cmsImage(page.value, 'header_image')

usePageSeo({
  title: () => cmsText(page.value, 'title'),
  description,
  image,
})

const seoUrl = useSeoUrl()
const language = useLanguage()
useJsonLd('article', () => ({
  '@type': 'Article',
  headline: cmsText(page.value, 'title'),
  description: toMetaDescription(description.value),
  image: image(),
  dateModified: cmsText(page.value, 'modified'),
  inLanguage: language.value,
  mainEntityOfPage: seoUrl(route.path),
  author: { '@type': 'Organization', name: 'DE.CO.DE', url: seoUrl('/') },
  publisher: { '@type': 'Organization', name: 'DE.CO.DE', url: seoUrl('/') },
}))
useBreadcrumbJsonLd(() => {
  const parents = segments.slice(0, -1)
  return [
    ['Investigation Guide', '/guide'],
    ...parents.map((_, i): [string, string] => [parents[i]!.replace(/-/g, ' '), `/guide/${parents.slice(0, i + 1).join('/')}`]),
    [cmsText(page.value, 'title') ?? id, route.path],
  ]
})

// Same flat, intendedTemplate:'default' list guide/index.vue's own grid
// is built from — this article's position in it is what determines its
// badge color (GuideCard.vue) and its prev/next neighbors here.
const guideList = await useKirbyCollection<{ id: string }>(
  'guide:order',
  "site.children.filterBy('intendedTemplate', 'default')",
  { id: true },
)

const currentIndex = computed(() => guideList.value?.findIndex((a) => a.id === id) ?? -1)
const badgeColor = computed(() => badgeColorFor(currentIndex.value === -1 ? 0 : currentIndex.value))
const prevTo = computed(() => {
  const prev = currentIndex.value > 0 ? guideList.value?.[currentIndex.value - 1] : null
  return prev ? `/guide/${prev.id}` : null
})
const nextTo = computed(() => {
  const list = guideList.value
  const next = list && currentIndex.value !== -1 && currentIndex.value < list.length - 1 ? list[currentIndex.value + 1] : null
  return next ? `/guide/${next.id}` : null
})

// Beside the related tool, on a page with no sub-pages to list there: what its
// editors chose (the `resources` block's links) first, then the resources
// sharing a keyword with it.
const hasSubpages = computed(() => ((page.value.subpages ?? []) as unknown[]).length > 0)
type KeywordRefs = Partial<Record<'themes' | 'concepts' | 'platforms' | 'questions', { id: string }[]>>
const KEYWORD_POOLS = ['themes', 'concepts', 'platforms', 'questions'] as const
const keywordIds = (item: KeywordRefs) => KEYWORD_POOLS.flatMap((pool) => (item[pool] ?? []).map((keyword) => keyword.id))
const resourcePool = hasSubpages.value
  ? null
  : await useKirbyCollection<KeywordRefs & { id: string, title: string }>(
      'guide:resource-pool',
      "site.index.filterBy('intendedTemplate', 'ressource')",
      {
        id: true,
        title: true,
        themes: pageSelects.default!.themes,
        concepts: pageSelects.default!.concepts,
        platforms: pageSelects.default!.platforms,
        questions: pageSelects.default!.questions,
      },
    )
const relatedResources = computed(() => {
  const blocks = (page.value.content ?? []) as { type?: string, isHidden?: boolean, content?: { resource_items?: { resource_title?: string, resource_type?: string, resource_link?: string }[] } }[]
  const chosen = blocks
    .filter((block) => block.type === 'resources' && !block.isHidden)
    .flatMap((block) => block.content?.resource_items ?? [])
    .filter((item) => item.resource_title && /^https?:/.test(item.resource_link ?? ''))
    .map((item) => ({ title: item.resource_title!, to: item.resource_link!, external: true }))
  const ownKeywords = new Set(keywordIds(page.value as KeywordRefs))
  const sharing = (resourcePool?.value ?? [])
    .filter((resource) => keywordIds(resource).some((id) => ownKeywords.has(id)))
    .map((resource) => ({ title: resource.title, to: `/resources/${resource.id}`, external: false }))
  return [...chosen, ...sharing].slice(0, 4)
})
</script>

<template>
  <TemplateDefault :page="page" :badge-color="badgeColor" :prev-to="prevTo" :next-to="nextTo" :related-resources="relatedResources" />
</template>
