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

// Opening the resource (and closing back into this card): see
// useSharedTransition.
const { style: sharedPart, open } = useCardTransition(() => props.item.id, () => `/resources/${props.item.id}`)
</script>

<template>
  <NuxtLink :to="`/resources/${item.id}`" class="resource-card" @mouseenter="onHover" @mouseleave="onLeave" @click.capture="open">
    <div class="resource-card-spacer" />
    <!-- display:contents on desktop (the card's own 3-row grid lays out
         the title and .resource-card-below directly); one block centered
         in the card on mobile. -->
    <div class="resource-card-content">
      <h2 class="resource-card-title text-h3" :title="item.title" :style="sharedPart('title')">{{ item.title }}</h2>
      <div class="resource-card-below">
        <span v-if="item.authors" class="resource-card-author text-caption" :title="item.authors" :style="sharedPart('authors')">{{ item.authors }}</span>
        <span class="resource-card-type text-tag" :style="sharedPart('type')">{{ item.type }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.resource-card {
  aspect-ratio: 1;
  box-sizing: border-box;
  background: var(--color-surface);
  /* Top+left only (not all 4 sides) — an internal grid edge then gets
     exactly one stroke, from whichever card sits below/right of it,
     instead of two adjacent cards each drawing their own line on the same
     edge. The grid's own outer right/bottom border (resources/index.vue)
     closes the box; the outer left stays open on purpose (see that file). */
  border-top: 1px solid var(--color-brand-resources);
  border-left: 1px solid var(--color-brand-resources);
  text-decoration: none;
  /* Two equal 1fr rows around the title's own auto row: the title sits
     exactly on the card's horizontal centre line on every card (so titles
     line up across a row), whether or not there are authors — those hang
     below it in the bottom row, with the type badge at its foot. */
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  justify-items: center;
  text-align: center;
  padding: 10%;
  transition: background-color 0.15s ease;
}

/* B8A084 at 40% opacity — same tint KeywordsPanel's own li:hover/.related
   uses, so hovering a resource card and hovering a keyword row read as the
   same interaction. */
.resource-card:hover {
  background-color: var(--color-hover-tint);
}

.resource-card:hover .resource-card-title,
.resource-card:hover .resource-card-author {
  color: var(--color-brand-about);
}

/* Authors directly under the title; the type badge pinned to the
   bottom of the same row, so it sits at the same height on every card. */
.resource-card-content {
  display: contents;
}

.resource-card-below {
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.resource-card-title {
  margin: 0;
  color: var(--color-brand-resources);
  /* Always one line — cut with an ellipsis right where it would wrap,
     whatever the card's current width (was a fixed 4-word cutoff, which
     still wrapped on narrow cards and cut short titles needlessly).
     max-width + the heading's width:100% give the ellipsis an edge to
     measure against inside the centered flex column. */
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-card-author {
  color: var(--color-brand-resources);
}

/* Shrink-to-fit rectangle behind the type label, not the full card width —
   display:inline-block is what keeps it tight around the text, same
   reasoning as the guide card's subtitle chip. */
.resource-card-type {
  flex-shrink: 0;
  margin-top: auto;
  display: inline-block;
  padding: 2px;
  background: var(--color-brand-resources);
  color: var(--color-on-fill);
}

/* Near-square on phones (a touch taller than wide). Title, authors and
   type sit together as one block centered in the card, not spread over
   the desktop's 3-row grid; authors cut to a single line with an
   ellipsis. min-height:0 and overflow:hidden hold the ratio regardless. */
@media (max-width: 768px) {
  .resource-card {
    aspect-ratio: 20 / 21;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8%;
  }

  .resource-card-spacer {
    display: none;
  }

  .resource-card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-width: 0;
  }

  .resource-card-below {
    justify-content: flex-start;
    gap: 8px;
  }

  .resource-card-author {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .resource-card-type {
    margin-top: 0;
  }
}
</style>
