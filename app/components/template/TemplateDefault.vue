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
    subpages?: { title: string, id: string }[]
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
  relatedResources?: { title: string, to: string, external: boolean }[]
}>()

// Only 'text' blocks are rendered — citation/cta/gallery/resources blocks
// aren't built yet (see page-selects.ts's own note on this; same scope
// boundary, just extended to actually render the one type that's plain
// body copy).
const textBlocks = computed(() => (props.page.content ?? []).filter((b) => b.type === 'text' && !b.isHidden))

// Only one related-tool button, not one per relation — an article's Tools
// field (default.yml) can hold several, but only the first is shown here.
const relatedTool = computed(() => props.page.tools?.[0] ?? null)

const language = useLanguage()
// The divider's right half, 2 by 2: this article's own case studies, or on a
// page without any (a case study itself), its related resources.
const dividerLinks = computed(() => {
  const subpages = props.page.subpages ?? []
  const fr = language.value === 'fr'
  return subpages.length
    ? {
        label: fr ? 'Dans cet article' : 'In this article',
        items: subpages.slice(0, 4).map((sub) => ({ title: sub.title, to: `/guide/${sub.id}`, external: false })),
      }
    : { label: fr ? 'Ressources liées' : 'Related resources', items: props.relatedResources ?? [] }
})

// A case study closes back to the article it belongs to, a plain step back;
// only an article morphs into its card on the guide.
const parentId = computed(() => props.page.id.split('/').slice(0, -1).join('/'))
const closeTo = computed(() => (parentId.value ? `/guide/${parentId.value}` : '/guide'))

// Opened from / closed back into its guide card: see useSharedTransition.
const { openedFromCard, drawState, bodyDecipher, root: articleEl, close: closeArticle, style: sharedPart } = useDetailTransition(
  () => props.page.id,
  '/guide',
  '.article-detail-block-title, .article-detail-paragraph',
)
</script>

<template>
  <DetailPanelChrome background="var(--color-brand-resources)" text-color="var(--color-on-fill)" :close-to="closeTo" :prev-to="prevTo" :next-to="nextTo" :close-draw="drawState" :on-close="parentId ? undefined : closeArticle">
    <article ref="articleEl" class="article-detail" :class="`detail-lines-${drawState}`">
      <div v-if="page.header_image" class="article-detail-cover">
        <img :src="page.header_image.url" :width="page.header_image.width" :height="page.header_image.height" :alt="page.header_image.alt || page.title" :style="sharedPart('image')">
      </div>

      <header class="article-detail-header">
        <h1 class="article-detail-title text-h1" :style="sharedPart('title')">
          <template v-if="openedFromCard">{{ page.title }}</template>
          <DecipherText v-else :text="page.title" />
        </h1>
        <BadgeChip v-if="page.header_subtitle" class="article-detail-subtitle" :color="badgeColor" :style="sharedPart('subtitle')">
          {{ page.header_subtitle }}
        </BadgeChip>
      </header>

      <TemplateDividerBand color="var(--color-on-fill)">
        <div class="article-detail-divider-half article-detail-divider-tool detail-draw-fade" :class="{ 'is-empty': !relatedTool }">
          <template v-if="relatedTool">
            <span class="article-detail-divider-label text-small">Related tool</span>
            <NuxtLink
              :to="`/tools/${relatedTool.slug}`"
              class="article-detail-tool-btn btn-fill text-label"
              :style="{ '--btn-fill': badgeColor }"
            >
              {{ relatedTool.title }}
            </NuxtLink>
          </template>
        </div>
        <div class="article-detail-divider-vertical detail-draw-vertical" />
        <nav v-if="dividerLinks.items.length" class="article-detail-divider-half article-detail-subpages detail-draw-fade" :aria-label="dividerLinks.label">
          <h2 class="article-detail-divider-label text-small">{{ dividerLinks.label }}</h2>
          <ul>
            <li v-for="item in dividerLinks.items" :key="item.to">
              <NuxtLink
                :to="item.to"
                :external="item.external"
                :target="item.external ? '_blank' : undefined"
                :rel="item.external ? 'noopener' : undefined"
                :title="item.title"
                class="text-note"
              >
                <span class="article-detail-subpage-title">{{ item.title }}</span>
                <span class="article-detail-subpage-arrow" aria-hidden="true">→</span>
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <div v-else class="article-detail-divider-half is-empty" />
      </TemplateDividerBand>

      <TemplateDetailBody color="var(--color-on-fill)">
        <div v-for="(block, index) in textBlocks" :key="index" class="article-detail-block">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <h2 v-if="block.content?.title" class="article-detail-block-title text-note" v-decipher="bodyDecipher" v-html="decipherHtml(block.content.title)" />
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
  height: auto;
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

/* Both halves start from the top on the same inset, so their two labels share
   a line and the tool button and first links sit level below them. */
.article-detail-divider-tool,
.article-detail-subpages {
  align-items: flex-start;
  justify-content: flex-start;
  padding: 12px 16px;
}

.article-detail-divider-label {
  margin: 0;
  font-weight: inherit;
  color: var(--color-on-fill);
}

/* Grows past the band's usual height for two rows of links. */
:deep(.divider-band-row) {
  height: auto;
  min-height: 10vh;
}

/* Index rows, like the keywords panel's: a rule above each, the whole row
   clickable, the arrow saying it leads somewhere. */
.article-detail-subpages ul {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.article-detail-subpages li {
  min-width: 0;
  border-bottom: 1px solid var(--color-on-fill);
}

/* Alone, it has no neighbour to leave room for. */
.article-detail-subpages li:only-child {
  grid-column: 1 / -1;
}

/* Every entry between two lines: the rows below share the one above's. */
.article-detail-subpages li:nth-child(-n + 2) {
  border-top: 1px solid var(--color-on-fill);
}

.article-detail-subpages a {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0 7px;
  color: inherit;
  text-decoration: none;
}

/* One line, cut with an ellipsis: the full title shows on hover (title). */
.article-detail-subpage-title {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.article-detail-subpages a:hover .article-detail-subpage-title {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}

.article-detail-subpage-arrow {
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.article-detail-subpages a:hover .article-detail-subpage-arrow {
  transform: translateX(3px);
}

/* Same look as Splash.vue's own .splash-cta (its one CTA button) — square
   corners, flat padding, uppercase — just recolored per-article via
   badgeColor instead of that button's fixed brown. Fill/hover colors:
   .btn-fill (main.css). */
.article-detail-tool-btn {
  display: inline-block;
  border-radius: 0;
  padding: 8px 12px;
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
  font-style: italic;
  font-weight: 700;
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
@media (max-width: 1150px) {
  /* Portrait 4/5 crop (same ratio as the desktop guide card's own image),
     inset 5.5% on every side — the divider band's rules and related tool
     below share that inset, so image and rules line up. */
  .article-detail-cover {
    padding: 5.5%;
  }

  :deep(.divider-band-line) {
    margin: 0 5.5%;
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
  }

  :deep(.divider-band-row) {
    height: auto;
    flex-direction: column;
  }

  .article-detail-divider-half {
    flex: none;
    width: 100%;
    padding: 14px 5.5%;
  }

  /* Stacked: the tool centered like the title above it, the links full width
     under a rule. An empty half would only add a blank strip. */
  .article-detail-divider-tool {
    align-items: center;
  }

  .article-detail-subpages {
    padding: 14px 5.5%;
    border-top: 1px solid var(--color-on-fill);
  }

  .article-detail-divider-half.is-empty,
  .article-detail-divider-vertical {
    display: none;
  }

  .article-detail-divider-half.is-empty + .article-detail-divider-vertical + .article-detail-subpages {
    border-top: none;
  }
}
</style>
