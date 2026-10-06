<script setup lang="ts">
const route = useRoute()
const category = assertSafeKirbyId(String(route.params.category))
const slug = assertSafeKirbyId(String(route.params.tag))

const page = await useKirbyPage(`keywords:${category}/${slug}`, `page('${category}/${slug}')`, 'tag')
</script>

<template>
  <TemplateTag :page="page" />
</template>
