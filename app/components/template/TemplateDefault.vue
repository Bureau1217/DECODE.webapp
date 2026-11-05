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
    themes?: { title: string, id: string }[]
    concepts?: { title: string, id: string }[]
    platforms?: { title: string, id: string }[]
    questions?: { title: string, id: string }[]
  }
  // Same color this article's own guide-grid card uses (GuideCard.vue) —
  // computed in guide/[...slug].vue from this article's position in the
  // guide list, so the subtitle chip and the related-tool button both
  // land on the same color a visitor already saw on the card they clicked.
  badgeColor: string
  prevTo?: string | null
  nextTo?: string | null
  relatedResources?: { title: string, to: string, external: boolean, type?: string }[]
}>()

// Only 'text' blocks are rendered — citation/cta/gallery/resources blocks
// aren't built yet (see page-selects.ts's own note on this; same scope
// boundary, just extended to actually render the one type that's plain
// body copy).
const textBlocks = computed(() => (props.page.content ?? []).filter((b) => b.type === 'text' && !b.isHidden))

// The concepts, platforms and themes mentioned in those: see useKeywordTerms.
const { mark, events: termEvents } = useKeywordTerms()
const blockTexts = computed(() => mark(textBlocks.value.map((block) => block.content?.text)))

// Only one related-tool button, not one per relation — an article's Tools
// field (default.yml) can hold several, but only the first is shown here.
const relatedTool = computed(() => props.page.tools?.[0] ?? null)

const language = useLanguage()
// The divider's right half.
const dividerLinks = computed(() => ({
  label: language.value === 'fr' ? 'Ressources liées' : 'Related resources',
  items: props.relatedResources ?? [],
}))

// This article's own sub-pages, at its foot.
const subpageLinks = computed(() => (props.page.subpages ?? []).map((sub) => ({ title: sub.title, to: `/guide/${sub.id}` })))


// The keywords this page carries, each with its own page.
const keywordLinks = computed(() => [...(props.page.concepts ?? []), ...(props.page.themes ?? []), ...(props.page.platforms ?? []), ...(props.page.questions ?? [])]
  .map((keyword) => ({ title: keyword.title, to: `/keywords/${keyword.id}` })))

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

// The title on one line: its usual size (.text-h1), smaller only if it won't fit.
const TITLE_SIDE_MARGIN = 12 // px each side, at the least
useFitLine(articleEl, () => [props.page.title], (el) => el.clientWidth - TITLE_SIDE_MARGIN * 2, () => (window.innerWidth <= 1150 ? 34 : 48))

// The pale blue is too light for the button's white text: its darker tone instead.
const toolButtonColor = computed(() => (props.badgeColor === BADGE_COLORS[1] ? deepBadgeColor(props.badgeColor) : props.badgeColor))
</script>

<template>
  <DetailPanelChrome background="var(--color-brand-resources)" text-color="var(--color-on-fill)" :close-to="closeTo" :prev-to="prevTo" :next-to="nextTo" :close-draw="drawState" :on-close="parentId ? undefined : closeArticle">
    <article ref="articleEl" class="article-detail" :class="`detail-lines-${drawState}`">
      <div v-if="page.header_image" class="article-detail-cover">
        <img :src="page.header_image.url" :width="page.header_image.width" :height="page.header_image.height" :alt="cleanAlt(page.header_image.alt, page.title)" :style="sharedPart('image')">
      </div>

      <header class="article-detail-header">
        <h1 class="article-detail-title text-h1" :style="sharedPart('title')">
          <template v-if="openedFromCard">{{ page.title }}</template>
          <DecipherText v-else :text="page.title" />
        </h1>
        <BadgeChip v-if="page.header_subtitle" class="article-detail-subtitle" caps :color="badgeColor" :style="sharedPart('subtitle')">
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
              :style="{ '--btn-fill': toolButtonColor }"
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
                <span v-if="item.type" class="article-detail-resource-type text-tag">{{ item.type }}</span>
                <span class="article-detail-resource-title">{{ item.title }}</span>
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <div v-else class="article-detail-divider-half is-empty" />
      </TemplateDividerBand>

      <TemplateDetailBody color="var(--color-on-fill)" v-on="termEvents">
        <div v-for="(block, index) in textBlocks" :key="index" class="article-detail-block">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <h2 v-if="block.content?.title" class="article-detail-block-title" v-decipher="bodyDecipher" v-html="decipherHtml(block.content.title)" />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            class="article-detail-paragraph"
            :class="{ 'article-detail-alinea': index === 0 }"
            v-decipher="bodyDecipher" v-html="decipherHtml(blockTexts[index])"
          />
        </div>
      </TemplateDetailBody>
      <DetailLinks :label="language === 'fr' ? 'Dans cet article' : 'In this article'" :items="subpageLinks" />
      <DetailLinks :label="language === 'fr' ? 'Mots-clés' : 'Keywords'" :items="keywordLinks" />
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
  white-space: nowrap;
  font-size: var(--fit-line-size, 48px);
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

/* Under their labels, the button and the resources end on the same line. */
.article-detail-tool-btn {
  margin-top: auto;
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

/* One per line: a framed tag, then the title, underlined. */
.article-detail-subpages ul {
  list-style: none;
  margin: auto 0 0;
  padding: 0;
  width: 100%;
  display: grid;
  gap: 8px;
}

.article-detail-subpages li {
  min-width: 0;
}

/* The resource cards' tag (ResourceCard.vue), outlined. */
.article-detail-resource-type {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid currentColor;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

/* The tag fills white while its resource is hovered. */
.article-detail-subpages a:hover .article-detail-resource-type,
.article-detail-subpages a:focus-visible .article-detail-resource-type {
  background: var(--color-on-fill);
  border-color: var(--color-on-fill);
  color: var(--color-brand-resources);
}

.article-detail-subpages a {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

/* One line, cut with an ellipsis: the full title shows on hover (title). */
.article-detail-resource-title {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  transition: opacity 0.15s ease;
}

.article-detail-subpages a:hover .article-detail-resource-title {
  opacity: 0.65;
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
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

/* On hover, only a stroke: the band shows through it. */
.article-detail-tool-btn:hover,
.article-detail-tool-btn:focus-visible {
  background-color: transparent;
  border-color: var(--color-on-fill);
  color: var(--color-on-fill);
}

/* Body box/font/v-html paragraph-spacing rules live in
   TemplateDetailBody.vue now — only this template's own per-block spacing
   and the alinea indent (first block only) stay here. */
.article-detail-block + .article-detail-block {
  margin-top: 1.5em;
}

/* The body text itself, in bold. */
.article-detail-block-title {
  margin: 0 0 0.3em;
  font: inherit;
  font-weight: 700;
}

/* The CMS wraps these titles in <em>, and there's no bold italic face. */
.article-detail-block-title :deep(em) {
  font-style: normal;
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

  /* The same margin as the title's (TITLE_SIDE_MARGIN). */
  .article-detail-header {
    padding: 0 12px;
  }

  .article-detail-title {
    margin-top: 16px;
    font-size: var(--fit-line-size, 34px);
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

  /* Stacked, the tool on the left, level with the links under it. An empty
     half would only add a blank strip. */
  .article-detail-subpages {
    padding: 14px 5.5%;
  }

  .article-detail-divider-half.is-empty,
  .article-detail-divider-vertical {
    display: none;
  }
}
</style>
