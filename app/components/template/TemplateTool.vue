<script setup lang="ts">
defineProps<{
  page: {
    title: string
    slug: string
    description?: string
    image?: { url: string; alt?: string } | null
    url?: string
  }
}>()
</script>

<template>
  <article>
    <img v-if="page.image" :src="page.image.url" :alt="page.image.alt || page.title">
    <h1>{{ page.title }}</h1>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="page.description" v-html="page.description" />
    <a v-if="page.url" :href="page.url" target="_blank" rel="noopener">{{ page.url }}</a>
  </article>
</template>
