<script setup lang="ts">
defineProps<{
  page: {
    title: string
    slug: string
    ressources?: {
      title: string
      slug: string
      id: string
      subtitle?: string
      description?: string
    }[]
  }
}>()
</script>

<template>
  <article>
    <h1>{{ page.title }}</h1>
    <ul>
      <li v-for="ressource in page.ressources" :key="ressource.id">
        <!-- `ressource.id` is already the full `theme-slug/item-slug` path. -->
        <NuxtLink :to="`/resources/${ressource.id}`">
          <h2>{{ ressource.title }}</h2>
          <p v-if="ressource.subtitle">{{ ressource.subtitle }}</p>
        </NuxtLink>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="ressource.description" v-html="ressource.description" />
      </li>
    </ul>
  </article>
</template>
