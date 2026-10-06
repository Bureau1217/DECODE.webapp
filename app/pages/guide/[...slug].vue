<script setup lang="ts">
// Every page under /guide is a `default` article (possibly nested — see
// `subpages` in page-selects.ts). `default` pages live at the root of the
// Kirby content tree with no `guide` prefix, so the full param path IS
// the Kirby id — `guide` only exists as a URL namespace in Nuxt.
const route = useRoute()
const segments = Array.isArray(route.params.slug) ? route.params.slug : []
const id = assertSafeKirbyId(segments.join('/'))

const page = await useKirbyPage(`guide:${id}`, `page('${id}')`, 'default')
</script>

<template>
  <TemplateDefault :page="page" />
</template>
