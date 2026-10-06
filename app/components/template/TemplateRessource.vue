<script setup lang="ts">
defineProps<{
  page: {
    title: string
    slug: string
    subtitle?: string
    authors?: string
    source?: string
    description?: string
    file?: { url: string; filename: string } | null
  }
}>()
</script>

<template>
  <article>
    <h1>{{ page.title }}</h1>
    <p v-if="page.subtitle">{{ page.subtitle }}</p>
    <p v-if="page.authors">{{ page.authors }}</p>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="page.description" v-html="page.description" />
    <a v-if="page.source" :href="page.source" target="_blank" rel="noopener">{{ page.source }}</a>
    <a v-if="page.file" :href="page.file.url" target="_blank" rel="noopener">{{ page.file.filename }}</a>
  </article>
</template>
