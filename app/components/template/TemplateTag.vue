<script setup lang="ts">
defineProps<{
  page: {
    title: string
    slug: string
    description?: string
    image?: { url: string; alt?: string }[]
  }
}>()
</script>

<template>
  <article>
    <h1>{{ page.title }}</h1>
    <div v-if="page.image?.length">
      <img v-for="img in page.image" :key="img.url" :src="img.url" :alt="img.alt || page.title">
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="page.description" v-html="page.description" />
  </article>
</template>
