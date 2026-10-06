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
</script>

<template>
  <component :is="templateComponent" :page="page" />
</template>
