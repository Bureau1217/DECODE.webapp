<script setup lang="ts">
const page = await useKirbyPage('page:tools', "page('tools')", 'tools')

usePageSeo({
  title: () => cmsText(page.value, 'title') ?? 'Tools against disinformation',
  description: 'Open tools against disinformation: a campaigns map, a bot and troll detector and a source reliability plugin.',
})
</script>

<template>
  <TemplateTools :page="page" />
</template>
