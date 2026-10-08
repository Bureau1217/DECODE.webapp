<script setup lang="ts">
import type { Component } from 'vue'
import TemplateFallback from '~/components/template/TemplateFallback.vue'
import TemplateRessource from '~/components/template/TemplateRessource.vue'
import TemplateRessources from '~/components/template/TemplateRessources.vue'

/*
 * One level deep (`/resources/theme`) is a `ressources` theme group, two
 * levels (`/resources/theme/item`) is a `ressource` item — depth alone
 * doesn't guarantee which, so the template is still resolved at request
 * time. `ressources`/`ressource` pages live at Kirby root with no
 * `resources` prefix, same deal as the `guide` namespace.
 */
const templateComponents: Record<string, Component> = {
  ressources: TemplateRessources,
  ressource: TemplateRessource,
}

const route = useRoute()
const segments = Array.isArray(route.params.slug) ? route.params.slug : []
const id = assertSafeKirbyId(segments.join('/'))

const page = await useKirbyPageAnyTemplate(`resources:${id}`, `page('${id}')`)

const templateComponent = computed(() => templateComponents[page.value?.template as string] ?? TemplateFallback)

// Same flattened, intendedTemplate:'ressource' order resources/index.vue's
// own grid is built from — only meaningful for a single ressource item
// (not the ressources theme listing), but cheap enough to always fetch.
const resourceList = await useKirbyCollection<{ id: string }>(
  'resources:order',
  "site.index.filterBy('intendedTemplate', 'ressource')",
  { id: true },
)

const currentIndex = computed(() => resourceList.value?.findIndex((r) => r.id === id) ?? -1)
const prevTo = computed(() => {
  const prev = currentIndex.value > 0 ? resourceList.value?.[currentIndex.value - 1] : null
  return prev ? `/resources/${prev.id}` : null
})
const nextTo = computed(() => {
  const list = resourceList.value
  const next = list && currentIndex.value !== -1 && currentIndex.value < list.length - 1 ? list[currentIndex.value + 1] : null
  return next ? `/resources/${next.id}` : null
})
</script>

<template>
  <TemplateRessource v-if="page?.template === 'ressource'" :page="page" :prev-to="prevTo" :next-to="nextTo" />
  <component :is="templateComponent" v-else :page="page" />
</template>
