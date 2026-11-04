<script setup lang="ts">
const route = useRoute()
const category = assertSafeKirbyId(String(route.params.category))
const slug = assertSafeKirbyId(String(route.params.tag))
const id = `${category}/${slug}`

const page = await useKirbyPage(`keywords:${id}`, `page('${id}')`, 'tag', { exact: true })

usePageSeo({
  title: () => cmsText(page.value, 'title'),
  description: () => cmsText(page.value, 'description'),
  image: () => cmsImage(page.value, 'image'),
})

// Previous/Next within its category, in the keywords panel's own order.
const categories = await useKeywordsPanelCategories()
const group = computed(() => categories.value?.find((c) => c.id === category))
const siblings = computed(() => group.value?.tags ?? [])
const position = computed(() => siblings.value.findIndex((tag) => tag.id === id))
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
  <TemplateTag :page="page" :id="id" :category="group?.title" :close-to="origin" :prev-to="prevTo" :next-to="nextTo" />
</template>
