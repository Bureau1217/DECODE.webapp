<script setup lang="ts">
// Mirrors the CMS's own "Mot-clés" Panel section (site/blueprints/site.yml):
// every root page using the `tags` template, each with its tag children —
// not a fixed list of category names, so a new category added in the CMS
// shows up here with no webapp changes.
//
// Shared across every page that shows this panel (app.vue) — pulled out of
// Home.vue, which used to own it alone, once it became "always visible"
// rather than home-only. On /about this still shows keywords for now; the
// content there is expected to switch to the team instead later.
interface CategoryWithTags {
  title: string
  slug: string
  id: string
  tags: { title: string, slug: string, id: string }[]
}

const categories = await useKirbyCollection<CategoryWithTags>(
  'keywords-panel',
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
  <aside class="keywords-panel">
    <template v-for="category in categories" :key="category.id">
      <h3>{{ category.title }}</h3>
      <ul>
        <li v-for="tag in category.tags" :key="tag.id">
          <NuxtLink :to="`/keywords/${category.slug}/${tag.slug}`">{{ tag.title }}</NuxtLink>
        </li>
      </ul>
    </template>
  </aside>
</template>

<style scoped>
/* Fixed, not in normal page flow — this is what makes it "always visible"
   independent of whatever each page's own content does. top: 8.5vh clears
   SiteNav + SiteIndexBar (1.5vh + 3.5vh + 3.5vh, both always rendered on
   every route this panel shows on — was 5vh, clearing only the nav, which
   left the first category hidden behind the (higher z-index) index bar).
   bottom: 0, not var(--footer-height) — same reasoning as .app-content
   (app.vue): this scrolls internally, and a long list runs behind the
   footer rather than being stopped short above it, with the footer's own
   opaque background + higher z-index covering it there. */
.keywords-panel {
  position: fixed;
  z-index: 1;
  left: 0;
  top: 8.5vh;
  bottom: 0;
  width: 50vw;
  overflow-y: auto;
}

/* Half the viewport, flush with the viewport's own left edge. */
.keywords-panel h3 {
  box-sizing: border-box;
  margin: 0;
  height: 30px;
  width: 50vw;
  padding-left: 10px;
  background: #b8a084;
  color: #fff;
  font-family: 'Martian Mono', monospace;
  font-weight: 500;
  font-size: 12pt;
  text-transform: uppercase;
  display: flex;
  align-items: center;
}

.keywords-panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.keywords-panel li {
  box-sizing: border-box;
  height: 26px;
  width: 50vw;
  background: #fff;
  border-top: 1px solid rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  transition: background-color 0.15s ease;
}

/* B8A084 at 40% opacity. */
.keywords-panel li:hover {
  background-color: rgba(184, 160, 132, 0.4);
}

.keywords-panel li a {
  display: block;
  box-sizing: border-box;
  height: 100%;
  padding-left: 10px;
  line-height: 24px;
  font-family: 'Martian Mono', monospace;
  font-size: 11pt;
  color: #3b382f;
  text-decoration: none;
}
</style>
