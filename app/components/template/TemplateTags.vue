<script setup lang="ts">
defineProps<{
  page: {
    title: string
    slug: string
    tags?: {
      title: string
      slug: string
      description?: string
      image?: { url: string; alt?: string }[]
    }[]
  }
}>()
</script>

<template>
  <article>
    <h1>{{ page.title }}</h1>
    <ul>
      <li v-for="tag in page.tags" :key="tag.slug">
        <!-- `page.slug` is the container's own slug (themes/concepts/platforms/question). -->
        <NuxtLink :to="`/keywords/${page.slug}/${tag.slug}`">
          <img v-if="tag.image?.[0]" :src="tag.image[0].url" :alt="tag.image[0].alt || tag.title">
          <h2>{{ tag.title }}</h2>
        </NuxtLink>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="tag.description" v-html="tag.description" />
      </li>
    </ul>
  </article>
</template>
