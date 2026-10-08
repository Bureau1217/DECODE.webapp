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
  <DetailPanelChrome background="#fff" text-color="#775937" close-to="/resources" :prev-to="prevTo" :next-to="nextTo">
    <article class="resource-detail">
      <header class="resource-detail-header">
        <h1 class="resource-detail-title">{{ page.title }}</h1>
        <p v-if="page.authors" class="resource-detail-author">{{ page.authors }}</p>
        <span v-if="page.type" class="resource-detail-type">{{ page.type }}</span>
      </header>

      <div class="resource-detail-divider-band">
        <div class="resource-detail-divider" />
        <div class="resource-detail-action-row">
          <a
            v-if="actionLabel && actionHref"
            :href="actionHref"
            target="_blank"
            rel="noopener"
            class="resource-detail-action-btn"
          >
            {{ actionLabel }}
          </a>
        </div>
        <div class="resource-detail-divider" />
      </div>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="page.description" class="resource-detail-description" v-html="page.description" />
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
  color: #775937;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 500;
  font-size: 48px;
}

.resource-detail-author {
  margin: 10px 0 0;
  color: #775937;
  font-family: 'Martian Mono', monospace;
  font-size: 12pt;
}

/* Same chip treatment as ResourceCard's own type badge. */
.resource-detail-type {
  display: inline-block;
  margin-top: 16px;
  padding: 2px;
  background: #b8a084;
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 500;
  font-size: 10pt;
  text-transform: uppercase;
}

.resource-detail-divider-band {
  margin-top: 40px;
}

/* B8A084, not white — this panel's background is white, so a white
   divider (the article variant's own color) would be invisible here. */
.resource-detail-divider {
  height: 1px;
  margin: 0 10px;
  background: #b8a084;
}

.resource-detail-action-row {
  height: 10vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Stroke only, white fill — the inverse of the article panel's solid
   .article-detail-tool-btn, matching this variant's own white/775937
   palette instead of a badge color. */
.resource-detail-action-btn {
  display: inline-block;
  background: #fff;
  color: #775937;
  border: 1px solid #775937;
  padding: 14px 24px;
  font-family: 'Martian Mono', monospace;
  font-size: 11pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-decoration: none;
  cursor: pointer;
}

.resource-detail-description {
  padding: 40px 10% 0;
  color: #775937;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 26px;
  line-height: 1.4;
}

.resource-detail-description :deep(p) {
  margin: 0;
}

.resource-detail-description :deep(p + p) {
  margin-top: 1em;
}
</style>
