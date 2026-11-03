<script setup lang="ts">
// Mirrors the CMS's own "Mot-clés" Panel section (site/blueprints/site.yml):
// it lists every root page using the `tags` template — not a fixed list of
// category names — so a new category added in the CMS shows up here with
// no webapp changes.
interface Category {
  title: string
  slug: string
  id: string
}

const categories = await useKirbyCollection<Category>(
  'keywords:index',
  "site.children.filterBy('intendedTemplate', 'tags')",
  { title: true, slug: true, id: true },
)

const language = useLanguage()

usePageSeo({
  title: 'Keywords',
  description: 'The DE.CO.DE keywords: themes, concepts, platforms and questions linking the guide, the tools and the resources.',
})
</script>

<template>
  <article>
    <h1 class="visually-hidden">{{ language === 'fr' ? 'Mots-clés' : 'Keywords' }}</h1>
    <ul>
      <li v-for="category in categories" :key="category.id">
        <NuxtLink :to="`/keywords/${category.id}`">{{ category.title }}</NuxtLink>
      </li>
    </ul>
  </article>
</template>
