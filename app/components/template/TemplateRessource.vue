<script setup lang="ts">
import { decipherHtml } from '~/utils/decipher'
const props = defineProps<{
  page: {
    title: string
    slug: string
    id: string
    subtitle?: string
    authors?: string
    source?: string
    description?: string
    file?: { url: string, filename: string } | null
    // Parent theme's own title (Articles/Papers/Podcasts/Videos) — same
    // "type" trick as ResourceCard.vue / resources/index.vue.
    type?: string
  }
  prevTo?: string | null
  nextTo?: string | null
}>()

// A file (PDF) wins over a link when a resource somehow has both — same
// precedence TemplateRessource's own old version already implied by
// rendering both, just now exclusive since only one button is wanted.
const actionLabel = computed(() => (props.page.file ? 'Download PDF' : props.page.source ? 'Read article' : null))
const actionHref = computed(() => props.page.file?.url ?? props.page.source ?? null)

// Opened from / closed back into its resource card: see
// useSharedTransition.
const { openedFromCard, drawState, bodyDecipher, root, close, style: sharedPart } = useDetailTransition(
  () => props.page.id,
  '/resources',
  '.resource-detail-description',
)
</script>

<template>
  <DetailPanelChrome background="var(--color-surface)" text-color="var(--color-brand-about)" close-to="/resources" :prev-to="prevTo" :next-to="nextTo" :close-draw="drawState" :on-close="close">
    <article ref="root" class="resource-detail" :class="`detail-lines-${drawState}`">
      <header class="resource-detail-header">
        <div class="resource-detail-header-spacer" />
        <h1 class="resource-detail-title text-h1" :style="sharedPart('title')">
          <template v-if="openedFromCard">{{ page.title }}</template>
          <DecipherText v-else :text="page.title" />
        </h1>
        <div class="resource-detail-meta">
          <p v-if="page.authors" class="resource-detail-author text-row" :style="sharedPart('authors')">{{ page.authors }}</p>
          <span v-if="page.type" class="resource-detail-type text-tag" :style="sharedPart('type')">{{ page.type }}</span>
        </div>
      </header>

      <TemplateDividerBand color="var(--color-brand-resources)">
        <a
          v-if="actionLabel && actionHref"
          :href="actionHref"
          target="_blank"
          rel="noopener"
          class="resource-detail-action-btn detail-draw-fade text-label"
        >
          {{ actionLabel }}
        </a>
      </TemplateDividerBand>

      <TemplateDetailBody v-if="page.description" color="var(--color-brand-about)">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="resource-detail-description" v-decipher="bodyDecipher" v-html="decipherHtml(page.description)" />
      </TemplateDetailBody>
    </article>
  </DetailPanelChrome>
</template>

<style scoped>
.resource-detail-header {
  /* Fixed-height box, title alone centered both ways in it: two equal 1fr
     rows sandwich the title's own auto row, so the title's center is
     always the box's center — one line or three, with or without authors
     (which hang below it, in the bottom 1fr, without nudging it). The
     divider band below never moves either. Was padding-top + natural
     height, which shifted everything by however many lines wrapped. */
  height: 32vh;
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  justify-items: center;
  padding: 0 8%;
  text-align: center;
}

.resource-detail-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Capped at 3 lines so an unusually long title can't outgrow the fixed
   header box above (and push the type chip out of it). */
.resource-detail-title {
  margin: 0;
  color: var(--color-brand-about);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.resource-detail-author {
  margin: 10px 0 0;
  color: var(--color-brand-about);
}

/* Same chip treatment as ResourceCard's own type badge. */
.resource-detail-type {
  display: inline-block;
  margin-top: 16px;
  padding: 2px;
  background: var(--color-brand-resources);
  color: var(--color-on-fill);
}

/* Divider-band shell lives in TemplateDividerBand.vue now (this one has no
   two-column content to stretch against, unlike the article variant — so
   margin:auto self-centers this single button both ways within the band's
   row, in place of that row's own removed align-items/justify-content).
   Stroke only, white fill — the inverse of the article panel's solid
   .article-detail-tool-btn, matching this variant's own white/775937
   palette instead of a badge color. */
.resource-detail-action-btn {
  display: inline-block;
  margin: auto;
  background: var(--color-surface);
  color: var(--color-brand-about);
  border: 1px solid var(--color-brand-about);
  padding: 14px 24px;
  text-decoration: none;
  cursor: pointer;
}

/* Body box/font/v-html paragraph-spacing rules live in
   TemplateDetailBody.vue now — nothing left to override locally. */
</style>
