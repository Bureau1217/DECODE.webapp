<script setup lang="ts">
// Mirrors the CMS's own "Mot-clés" Panel section (site/blueprints/site.yml):
// every root page using the `tags` template, each with its tag children —
// not a fixed list of category names, so a new category added in the CMS
// shows up here with no webapp changes.
interface CategoryWithTags {
  title: string
  slug: string
  id: string
  tags: { title: string, slug: string, id: string }[]
}

const categories = await useKirbyCollection<CategoryWithTags>(
  'home:keywords',
  "site.children.filterBy('intendedTemplate', 'tags')",
  {
    title: true,
    slug: true,
    id: true,
    tags: {
      query: 'page.children',
      select: { title: true, slug: true, id: true },
    },
  },
)
</script>

<template>
  <div class="home">
    <aside class="keywords">
      <h2>Mots-clés</h2>

      <template v-for="category in categories" :key="category.id">
        <h3>{{ category.title }}</h3>
        <ul>
          <li v-for="tag in category.tags" :key="tag.id">
            <NuxtLink :to="`/keywords/${category.slug}/${tag.slug}`">{{ tag.title }}</NuxtLink>
          </li>
        </ul>
      </template>
    </aside>

    <!-- Custom visual — placeholder, real one not designed yet. -->
    <main class="visual-placeholder">
      Visuel personnalisé à venir
    </main>
  </div>
</template>
