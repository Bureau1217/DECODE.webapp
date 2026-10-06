<script setup lang="ts">
defineProps<{
  page: {
    title: string
    slug: string
    tools?: {
      title: string
      slug: string
      description?: string
      image?: { url: string; alt?: string } | null
      url?: string
    }[]
  }
}>()
</script>

<template>
  <article>
    <h1>{{ page.title }}</h1>
    <ul>
      <li v-for="tool in page.tools" :key="tool.slug">
        <NuxtLink :to="`/tools/${tool.slug}`">
          <img v-if="tool.image" :src="tool.image.url" :alt="tool.image.alt || tool.title">
          <h2>{{ tool.title }}</h2>
        </NuxtLink>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="tool.description" v-html="tool.description" />
      </li>
    </ul>
  </article>
</template>
