<script setup lang="ts">
const route = useRoute()
const slug = assertSafeKirbyId(String(route.params.tool))
const page = await useKirbyPage(`page:tools/${slug}`, `page('tools/${slug}')`, 'tool')
</script>

<template>
  <TemplateTool :page="page" />
</template>
