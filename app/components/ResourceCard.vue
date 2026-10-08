<script setup lang="ts">
import type { KeywordRef } from '~/types/article'

// A resource item's "type" isn't a field on the item itself — the CMS
// encodes it as the title of its parent theme page (DECODE.cms/content/
// articles, papers, podcasts, videos — each a `ressources` page holding
// `ressource` children), fetched via `page.parent.title` in
// resources/index.vue and passed through here as-is.
export interface ResourceItem {
  title: string
  id: string
  authors?: string
  type: string
  // Same 4 keyword pools as the guide's Article (ressource.yml now has the
  // same keywords_section fields as default.yml) — drives the hover
  // highlight below, same as GuideCard.
  themes?: KeywordRef[]
  concepts?: KeywordRef[]
  platforms?: KeywordRef[]
  questions?: KeywordRef[]
}

const props = defineProps<{
  item: ResourceItem
}>()

const { onHover, onLeave } = useArticleCardHighlight(computed(() => props.item))

// Longer titles ("Information Disorder: Toward an Interdisciplinary
// Framework for Research and Policy Making") would otherwise outgrow the
// card — first 4 words only, same cutoff regardless of the source title's
// actual length.
const truncatedTitle = computed(() => {
  const words = props.item.title.split(' ')
  return words.length > 4 ? `${words.slice(0, 4).join(' ')}…` : props.item.title
})
</script>

<template>
  <NuxtLink :to="`/resources/${item.id}`" class="resource-card" @mouseenter="onHover" @mouseleave="onLeave">
    <div class="resource-card-heading">
      <h2 class="resource-card-title">{{ truncatedTitle }}</h2>
      <span v-if="item.authors" class="resource-card-author">{{ item.authors }}</span>
    </div>
    <span class="resource-card-type">{{ item.type }}</span>
  </NuxtLink>
</template>

<style scoped>
.resource-card {
  aspect-ratio: 1;
  box-sizing: border-box;
  background: #fff;
  /* Top+left only (not all 4 sides) — an internal grid edge then gets
     exactly one stroke, from whichever card sits below/right of it,
     instead of two adjacent cards each drawing their own line on the same
     edge. The grid's own outer right/bottom border (resources/index.vue)
     closes the box; the outer left stays open on purpose (see that file). */
  border-top: 1px solid #b8a084;
  border-left: 1px solid #b8a084;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10%;
  transition: background-color 0.15s ease;
}

/* B8A084 at 40% opacity — same tint KeywordsPanel's own li:hover/.related
   uses, so hovering a resource card and hovering a keyword row read as the
   same interaction. */
.resource-card:hover {
  background-color: rgba(184, 160, 132, 0.4);
}

.resource-card:hover .resource-card-title,
.resource-card:hover .resource-card-author {
  color: #775937;
}

/* flex:1 (not the card centering everything as one block) is what keeps
   .resource-card-type at the same height on every card regardless of how
   many lines a given title/author wraps to — it takes all the space the
   type badge below doesn't need, and centers the heading within that,
   rather than the heading's own height shifting the badge up or down. */
.resource-card-heading {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.resource-card-title {
  margin: 0;
  color: #b8a084;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 400;
  font-size: 16pt;
  line-height: 1.25;
}

.resource-card-author {
  color: #b8a084;
  font-family: 'Martian Mono', monospace;
  font-size: 9pt;
}

/* Shrink-to-fit rectangle behind the type label, not the full card width —
   display:inline-block is what keeps it tight around the text, same
   reasoning as the guide card's subtitle chip. */
.resource-card-type {
  flex-shrink: 0;
  margin-top: 40px;
  display: inline-block;
  padding: 2px;
  background: #b8a084;
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 500;
  font-size: 10pt;
  text-transform: uppercase;
}
</style>
