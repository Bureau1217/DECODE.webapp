<script setup lang="ts">
// Every page under /guide is a `default` article (possibly nested — see
// `subpages` in page-selects.ts). `default` pages live at the root of the
// Kirby content tree with no `guide` prefix, so the full param path IS
// the Kirby id — `guide` only exists as a URL namespace in Nuxt.
const route = useRoute()
const segments = Array.isArray(route.params.slug) ? route.params.slug : []
const id = assertSafeKirbyId(segments.join('/'))

const page = await useKirbyPage(`guide:${id}`, `page('${id}')`, 'default')

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
</script>

<template>
  <TemplateDefault :page="page" :badge-color="badgeColor" :prev-to="prevTo" :next-to="nextTo" />
</template>
