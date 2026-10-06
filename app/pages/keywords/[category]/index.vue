<script setup lang="ts">
// `category` is any root page with template `tags` (themes, concepts,
// platforms, question, …) — `/keywords` is a Nuxt-only namespace, these
// still live at Kirby root with no `keywords` prefix.
const route = useRoute()
const category = assertSafeKirbyId(String(route.params.category))

const page = await useKirbyPage(`keywords:${category}`, `page('${category}')`, 'tags')
</script>

<template>
  <TemplateTags :page="page" />
</template>
