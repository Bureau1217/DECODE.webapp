<script setup lang="ts">
import { decipherHtml } from '~/utils/decipher'
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

// Opened from / closed back into its guide card: see useSharedTransition.
const { openedFromCard, drawState, bodyDecipher, root: articleEl, close: closeArticle, style: sharedPart } = useDetailTransition(
  () => props.page.id,
  '/guide',
  '.article-detail-block-title, .article-detail-paragraph',
)
</script>

<template>
  <DetailPanelChrome background="var(--color-brand-resources)" text-color="var(--color-on-fill)" close-to="/guide" :prev-to="prevTo" :next-to="nextTo" :close-draw="drawState" :on-close="closeArticle">
    <article ref="articleEl" class="article-detail" :class="`detail-lines-${drawState}`">
      <div v-if="page.header_image" class="article-detail-cover">
        <img :src="page.header_image.url" :alt="page.header_image.alt || page.title" :style="sharedPart('image')">
      </div>

      <header class="article-detail-header">
        <h1 class="article-detail-title" :style="sharedPart('title')">
          <template v-if="openedFromCard">{{ page.title }}</template>
          <DecipherText v-else :text="page.title" />
        </h1>
        <BadgeChip v-if="page.header_subtitle" class="article-detail-subtitle" :color="badgeColor" :style="sharedPart('subtitle')">
          {{ page.header_subtitle }}
        </BadgeChip>
      </header>

      <TemplateDividerBand color="var(--color-on-fill)">
        <div class="article-detail-divider-half" />
        <div class="article-detail-divider-vertical detail-draw-vertical" />
        <div class="article-detail-divider-half article-detail-divider-half-right detail-draw-fade">
          <template v-if="relatedTool">
            <span class="article-detail-related-label">Related tool</span>
            <NuxtLink
              :to="`/tools/${relatedTool.slug}`"
              class="article-detail-tool-btn btn-fill"
              :style="{ '--btn-fill': badgeColor }"
            >
              {{ relatedTool.title }}
            </NuxtLink>
          </template>
        </div>
      </TemplateDividerBand>

      <TemplateDetailBody color="var(--color-on-fill)">
        <div v-for="(block, index) in textBlocks" :key="index" class="article-detail-block">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <h2 v-if="block.content?.title" class="article-detail-block-title" v-decipher="bodyDecipher" v-html="decipherHtml(block.content.title)" />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            class="article-detail-paragraph"
            :class="{ 'article-detail-alinea': index === 0 }"
            v-decipher="bodyDecipher" v-html="decipherHtml(block.content?.text)"
          />
        </div>
      </TemplateDetailBody>
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
  /* Shrink-wrapped to its text (not the full row), so its box matches the
     guide card title's shape for the opening morph (useArticleOpening). */
  width: fit-content;
  margin: 20px auto 0;
  color: var(--color-on-fill);
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: 48px;
}

/* Chip look itself lives in BadgeChip.vue now — only this header's own
   spacing stays here. */
.article-detail-subtitle {
  margin: 10px 0 0;
}

/* Divider-band shell (lines/row/spacing) lives in TemplateDividerBand.vue
   now — only this template's own two-column row content stays here. */
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
  background: var(--color-surface);
}

/* Left-aligned (not centered, like the generic .article-detail-divider-half)
   so the button's own left edge lines up with the "Related tool" label's. */
.article-detail-divider-half-right {
  align-items: flex-start;
  padding-left: 16px;
}

.article-detail-related-label {
  color: var(--color-on-fill);
  font-family: var(--font-mono);
  font-size: 10pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Same look as Splash.vue's own .splash-cta (its one CTA button) — square
   corners, flat padding, uppercase — just recolored per-article via
   badgeColor instead of that button's fixed brown. Fill/hover colors:
   .btn-fill (main.css). */
.article-detail-tool-btn {
  display: inline-block;
  border-radius: 0;
  padding: 8px 12px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}

/* Body box/font/v-html paragraph-spacing rules live in
   TemplateDetailBody.vue now — only this template's own per-block spacing
   and the alinea indent (first block only) stay here. */
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

/* A plain first-line indent (alinéa), not a drop cap — :first-child
   reaches the actual <p> injected by v-html. */
.article-detail-alinea :deep(:first-child) {
  text-indent: 2em;
}

/* Stacked full-width rows (Chapitre.png's own mobile mockup), not the
   desktop 50/50 side-by-side split — too narrow at phone width for both
   halves to stay legible next to each other. :deep() reaches
   TemplateDividerBand.vue's own .divider-band-row (a 10vh fixed-height
   flex row on desktop) since the stacking need is specific to this
   template's 2-column content, not every consumer of that shared shell
   (TemplateRessource.vue's own single centered child stays untouched). */
@media (max-width: 768px) {
  /* Portrait 4/5 crop (same ratio as the desktop guide card's own image),
     inset 2.5% on every side — the divider band's rules below share that
     same inset (TemplateDividerBand.vue), so image and rules line up. */
  .article-detail-cover {
    padding: 2.5%;
  }

  .article-detail-cover img {
    aspect-ratio: 4 / 5;
    object-fit: cover;
  }

  .article-detail-header {
    padding: 0 6%;
  }

  .article-detail-title {
    margin-top: 16px;
    font-size: 36px;
  }

  :deep(.divider-band-row) {
    height: auto;
    flex-direction: column;
  }

  .article-detail-divider-half {
    flex: none;
    width: 100%;
    padding: 14px 2.5%;
  }

  /* Centered like the title above it, not the desktop's left-start. */
  .article-detail-divider-half-right {
    align-items: center;
  }

  /* The left half is empty — stacked, it only added a blank strip and a
     second rule above the related tool. */
  .article-detail-divider-half:not(.article-detail-divider-half-right),
  .article-detail-divider-vertical {
    display: none;
  }
}
</style>
