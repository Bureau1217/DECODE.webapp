<script setup lang="ts">
interface ToolRef {
  title: string
  slug: string
  id: string
}

interface ContentBlock {
  type: string
  isHidden?: boolean
  content?: { title?: string, text?: string }
}

const props = defineProps<{
  page: {
    title: string
    slug: string
    id: string
    header_subtitle?: string
    header_image?: { url: string, alt?: string } | null
    content?: ContentBlock[]
    tools?: ToolRef[]
  }
  // Same color this article's own guide-grid card uses (GuideCard.vue) —
  // computed in guide/[...slug].vue from this article's position in the
  // guide list, so the subtitle chip and the related-tool button both
  // land on the same color a visitor already saw on the card they clicked.
  badgeColor: string
  prevTo?: string | null
  nextTo?: string | null
}>()

// Only 'text' blocks are rendered — citation/cta/gallery/resources blocks
// aren't built yet (see page-selects.ts's own note on this; same scope
// boundary, just extended to actually render the one type that's plain
// body copy).
const textBlocks = computed(() => (props.page.content ?? []).filter((b) => b.type === 'text' && !b.isHidden))

// Only one related-tool button, not one per relation — an article's Tools
// field (default.yml) can hold several, but only the first is shown here.
const relatedTool = computed(() => props.page.tools?.[0] ?? null)
</script>

<template>
  <DetailPanelChrome background="#b8a084" text-color="#fff" close-to="/guide" :prev-to="prevTo" :next-to="nextTo">
    <article class="article-detail">
      <div v-if="page.header_image" class="article-detail-cover">
        <img :src="page.header_image.url" :alt="page.header_image.alt || page.title">
      </div>

      <header class="article-detail-header">
        <h1 class="article-detail-title">{{ page.title }}</h1>
        <span
          v-if="page.header_subtitle"
          class="article-detail-subtitle"
          :style="{ backgroundColor: badgeColor }"
        >
          {{ page.header_subtitle }}
        </span>
      </header>

      <div class="article-detail-divider-band">
        <div class="article-detail-divider" />
        <div class="article-detail-divider-row">
          <div class="article-detail-divider-half" />
          <div class="article-detail-divider-vertical" />
          <div class="article-detail-divider-half article-detail-divider-half-right">
            <template v-if="relatedTool">
              <span class="article-detail-related-label">Related tool</span>
              <NuxtLink
                :to="`/tools/${relatedTool.slug}`"
                class="article-detail-tool-btn"
                :style="{ backgroundColor: badgeColor }"
              >
                {{ relatedTool.title }}
              </NuxtLink>
            </template>
          </div>
        </div>
        <div class="article-detail-divider" />
      </div>

      <div class="article-detail-body">
        <div v-for="(block, index) in textBlocks" :key="index" class="article-detail-block">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <h2 v-if="block.content?.title" class="article-detail-block-title" v-html="block.content.title" />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            class="article-detail-paragraph"
            :class="{ 'article-detail-alinea': index === 0 }"
            v-html="block.content?.text"
          />
        </div>
      </div>
    </article>
  </DetailPanelChrome>
</template>

<style scoped>
/* padding% here, not a fixed max-width — scales with the panel the way
   the spec asked for (5% top, 20% each side) rather than clamping to a
   fixed reading width. */
.article-detail-cover {
  padding: 5% 20% 0;
  box-sizing: border-box;
}

.article-detail-cover img {
  width: 100%;
  display: block;
}

.article-detail-header {
  text-align: center;
}

.article-detail-title {
  margin: 20px 0 0;
  color: #fff;
  font-family: 'EB Garamond', Garamond, serif;
  font-weight: 500;
  font-size: 48px;
}

/* Same chip treatment as the guide card's own subtitle (GuideCard.vue) —
   tight, shrink-to-fit rectangle, same badgeColor as that card. */
.article-detail-subtitle {
  display: inline-block;
  margin: 10px 0 0;
  padding: 1px;
  color: #000;
  font-family: 'EB Garamond', Garamond, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 12pt;
}

.article-detail-divider-band {
  margin-top: 40px;
}

.article-detail-divider {
  height: 1px;
  margin: 0 10px;
  background: #fff;
}

/* The two dividers above/below this row are what give the "spaced by 10%
   of viewport height" gap — this row's own height is that gap. */
.article-detail-divider-row {
  height: 10vh;
  display: flex;
}

.article-detail-divider-half {
  flex: 1 1 50%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.article-detail-divider-vertical {
  width: 1px;
  background: #fff;
}

/* Left-aligned (not centered, like the generic .article-detail-divider-half)
   so the button's own left edge lines up with the "Related tool" label's. */
.article-detail-divider-half-right {
  align-items: flex-start;
  padding-left: 16px;
}

.article-detail-related-label {
  color: #fff;
  font-family: 'Martian Mono', monospace;
  font-size: 10pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Same look as Splash.vue's own .splash-cta (its one CTA button) — square
   corners, flat padding, uppercase — just recolored per-article via
   badgeColor instead of that button's fixed brown. */
.article-detail-tool-btn {
  display: inline-block;
  color: #fff;
  border: none;
  border-radius: 0;
  padding: 8px 12px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}

.article-detail-body {
  padding: 40px 10% 0;
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 26px;
  line-height: 1.4;
}

.article-detail-block + .article-detail-block {
  margin-top: 1.5em;
}

.article-detail-block-title {
  margin: 0 0 0.3em;
  font-family: Arial, Helvetica, sans-serif;
  font-style: italic;
  font-weight: 700;
  font-size: 0.7em;
}

.article-detail-paragraph :deep(p) {
  margin: 0;
}

.article-detail-paragraph :deep(p + p) {
  margin-top: 1em;
}

/* A plain first-line indent (alinéa), not a drop cap — :first-child
   reaches the actual <p> injected by v-html. */
.article-detail-alinea :deep(:first-child) {
  text-indent: 2em;
}
</style>
