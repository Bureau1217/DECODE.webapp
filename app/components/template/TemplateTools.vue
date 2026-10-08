<script setup lang="ts">
import type { Tool } from '~/components/ToolCard.vue'

defineProps<{
  page: {
    title: string
    slug: string
    tools?: Tool[]
  }
}>()

// Leaving this page shouldn't leave some other tool's keywords highlighted
// in the panel — same reasoning as guide/index.vue and resources/index.vue.
const highlighted = useHighlightedKeywords()
onUnmounted(() => {
  highlighted.value = null
})
</script>

<template>
  <article class="tools-list">
    <ToolCard v-for="(tool, index) in page.tools?.slice(0, 3)" :key="tool.id" :item="tool" :index="index" />
  </article>
</template>

<style scoped>
/* Fills exactly the space between SiteNav/SiteIndexBar (8.5vh, top) and
   SiteFooter (var(--footer-height), bottom) — same reasoning as the guide
   grid (guide/index.vue). 3 fixed rows, not however many tools the CMS
   has — a 4th tool has nowhere to go yet, same "fixed grid" choice as
   guide/resources. */
.tools-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #fff;
  height: calc(100vh - 8.5vh - var(--footer-height));
}
</style>
