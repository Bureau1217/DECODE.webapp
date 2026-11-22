<script setup lang="ts">
// Body text typeset (no widows, French spacing; never titles).
const typeset = useTypeset()
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
    <img v-if="page.image" :src="page.image.url" :alt="cleanAlt(page.image.alt, page.title)">
    <h1 class="text-h1">{{ page.title }}</h1>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="page.description" class="text-note" v-html="typeset(page.description)" />
    <a v-if="page.url" :href="page.url" target="_blank" rel="noopener">{{ page.url }}</a>
  </article>
</template>
