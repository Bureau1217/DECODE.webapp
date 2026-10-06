<script setup lang="ts">
interface Article {
  title: string
  slug: string
  id: string
  header_subtitle?: string
  header_image?: { url: string, alt?: string } | null
}

const articles = await useKirbyCollection<Article>(
  'guide:index',
  "site.children.filterBy('intendedTemplate', 'default')",
  {
    title: true,
    slug: true,
    id: true,
    header_subtitle: true,
    header_image: {
      query: 'page.header_image.toFile',
      select: { url: true, alt: true },
    },
  },
)
</script>

<template>
  <article>
    <h1>Guide de la désinformation</h1>
    <ul>
      <li v-for="item in articles" :key="item.id">
        <NuxtLink :to="`/guide/${item.id}`">
          <img v-if="item.header_image" :src="item.header_image.url" :alt="item.header_image.alt || item.title">
          <h2>{{ item.title }}</h2>
          <p v-if="item.header_subtitle">{{ item.header_subtitle }}</p>
        </NuxtLink>
      </li>
    </ul>
  </article>
</template>
