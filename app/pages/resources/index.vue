<script setup lang="ts">
interface ResourceTheme {
  title: string
  slug: string
  id: string
}

const themes = await useKirbyCollection<ResourceTheme>(
  'resources:index',
  "site.children.filterBy('intendedTemplate', 'ressources')",
  { title: true, slug: true, id: true },
)
</script>

<template>
  <article>
    <ul>
      <li v-for="theme in themes" :key="theme.id">
        <NuxtLink :to="`/resources/${theme.id}`">{{ theme.title }}</NuxtLink>
      </li>
    </ul>
  </article>
</template>
