<script setup lang="ts">
const props = defineProps<{
  page: {
    title: string
    slug: string
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
</script>

<template>
  <DetailPanelChrome background="var(--color-surface)" text-color="var(--color-brand-about)" close-to="/resources" :prev-to="prevTo" :next-to="nextTo">
    <article class="resource-detail">
      <header class="resource-detail-header">
        <h1 class="resource-detail-title">{{ page.title }}</h1>
        <p v-if="page.authors" class="resource-detail-author">{{ page.authors }}</p>
        <span v-if="page.type" class="resource-detail-type">{{ page.type }}</span>
      </header>

      <TemplateDividerBand color="var(--color-brand-resources)">
        <a
          v-if="actionLabel && actionHref"
          :href="actionHref"
          target="_blank"
          rel="noopener"
          class="resource-detail-action-btn"
        >
          {{ actionLabel }}
        </a>
      </TemplateDividerBand>

      <TemplateDetailBody v-if="page.description" color="var(--color-brand-about)">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="resource-detail-description" v-html="page.description" />
      </TemplateDetailBody>
    </article>
  </DetailPanelChrome>
</template>

<style scoped>
.resource-detail-header {
  text-align: center;
  padding-top: 5%;
}

.resource-detail-title {
  margin: 0;
  color: var(--color-brand-about);
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: 48px;
}

.resource-detail-author {
  margin: 10px 0 0;
  color: var(--color-brand-about);
  font-family: var(--font-mono);
  font-size: 12pt;
}

/* Same chip treatment as ResourceCard's own type badge. */
.resource-detail-type {
  display: inline-block;
  margin-top: 16px;
  padding: 2px;
  background: var(--color-brand-resources);
  color: var(--color-surface);
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: 10pt;
  text-transform: uppercase;
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
  font-family: var(--font-mono);
  font-size: 11pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-decoration: none;
  cursor: pointer;
}

/* Body box/font/v-html paragraph-spacing rules live in
   TemplateDetailBody.vue now — nothing left to override locally. */
</style>
