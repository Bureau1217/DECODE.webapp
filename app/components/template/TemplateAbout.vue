<script setup lang="ts">
import { decipherHtml } from '~/utils/decipher'
// Body text typeset (no widows, French spacing; never titles).
const typeset = useTypeset()
interface ContentBlock {
  id?: string
  type: string
  isHidden?: boolean
  content?: { title?: string, text?: string, alt?: string, caption?: string }
}
interface BlockImage {
  id: string
  image: { url: string, alt?: string, width?: number, height?: number } | null
}

const props = defineProps<{
  page: {
    title: string
    slug: string
    id: string
    header_subtitle?: string
    paragraph_1_title?: string
    paragraph_1_content?: ContentBlock[]
    paragraph_1_images?: BlockImage[]
    paragraph_2_title?: string
    paragraph_2_content?: ContentBlock[]
    paragraph_2_images?: BlockImage[]
    paragraph_3_title?: string
    paragraph_3_content?: ContentBlock[]
    paragraph_3_images?: BlockImage[]
  }
  siteTitle: string
}>()

// 3 paragraphs, each keyed by its own title (the tab's own label — the
// only place that title shows now, not repeated as a heading above the
// text too). 'text' and 'image' blocks render, in the editor's order; an
// image block's file comes from paragraph_N_images (page-selects.ts),
// matched by the block's id, and is left out if it has none.
type Shown = { kind: 'text', html: string, first: boolean } | { kind: 'image', url: string, alt: string, width?: number, height?: number, caption?: string }
const paragraphs = computed(() =>
  [
    { title: props.page.paragraph_1_title, content: props.page.paragraph_1_content, images: props.page.paragraph_1_images },
    { title: props.page.paragraph_2_title, content: props.page.paragraph_2_content, images: props.page.paragraph_2_images },
    { title: props.page.paragraph_3_title, content: props.page.paragraph_3_content, images: props.page.paragraph_3_images },
  ]
    .filter((p): p is { title: string, content: ContentBlock[], images: BlockImage[] | undefined } => !!p.title)
    .map((p) => {
      const files = new Map((p.images ?? []).map((i) => [i.id, i.image]))
      const blocks: Shown[] = []
      let texts = 0
      for (const b of p.content ?? []) {
        if (b.isHidden) continue
        if (b.type === 'text') blocks.push({ kind: 'text', html: b.content?.text ?? '', first: texts++ === 0 })
        else if (b.type === 'image') {
          const file = b.id ? files.get(b.id) : null
          if (file?.url) blocks.push({ kind: 'image', url: file.url, alt: b.content?.alt || file.alt || '', width: file.width, height: file.height, caption: b.content?.caption })
        }
      }
      return { title: p.title, blocks }
    }),
)

// Real tabs, not anchors — one section showing at a time, swapped by
// clicking, not scrolled to. Starts on the first one so there's always
// something visible below without having to click first.
const activeIndex = ref(0)
</script>

<template>
  <DetailPanelChrome background="var(--color-surface)" text-color="var(--color-brand-about)">
    <article class="about-detail">
      <header class="about-detail-header">
        <h1 class="about-detail-title text-display"><DecipherText :text="siteTitle" /></h1>
        <h2 v-if="page.header_subtitle" class="about-detail-subtitle text-h2">{{ page.header_subtitle }}</h2>
      </header>

      <!-- In place of the article template's divider band — one tab per
           paragraph, styled like that template's own
           .article-detail-tool-btn (Splash.vue's .splash-cta look) only
           once active; otherwise a plain var(--color-brand-about) stroke. -->
      <nav class="about-detail-nav">
        <button
          v-for="(section, index) in paragraphs"
          :key="section.title"
          type="button"
          class="about-detail-nav-btn text-label"
          :class="{ active: activeIndex === index }"
          @click="activeIndex = index"
        >
          {{ section.title }}
        </button>
      </nav>

      <TemplateDetailBody color="var(--color-brand-about)">
        <section v-if="paragraphs[activeIndex]">
          <template v-for="(block, bIndex) in paragraphs[activeIndex]!.blocks" :key="`${activeIndex}-${bIndex}`">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div
              v-if="block.kind === 'text'"
              class="about-detail-paragraph"
              :class="{ 'about-detail-alinea': block.first }"
              v-decipher v-html="decipherHtml(typeset(block.html))"
            />
            <figure v-else class="about-detail-paragraph about-detail-figure">
              <img :src="block.url" :alt="block.alt" :width="block.width" :height="block.height" loading="lazy">
              <figcaption v-if="block.caption" class="text-small">{{ block.caption }}</figcaption>
            </figure>
          </template>
        </section>
      </TemplateDetailBody>
    </article>
  </DetailPanelChrome>
</template>

<style scoped>
.about-detail-header {
  text-align: center;
  padding-top: 5%;
}

/* Same face as SiteFooter.vue's own "DE.CO.DE" brand text. */
.about-detail-title {
  margin: 0;
  color: var(--color-brand-about);
}

.about-detail-subtitle {
  margin: 10px auto 0;
  max-width: 60%;
  color: var(--color-brand-about);
}

/* No gap — tabs sit flush against each other (see .about-detail-nav-btn's
   own -1px margin-left for why that doesn't double up their shared
   border). */
.about-detail-nav {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

/* Stroke-only var(--color-brand-about) at rest — a real tab's "not currently showing"
   state, not a disabled/secondary look. .active fills solid var(--color-brand-about)
   instead. margin-left:-1px (every button but the first) pulls each one
   left by exactly its own border-width, landing its left border on top
   of the previous button's right border — one line instead of two —
   while position:relative keeps a hovered/active button's own border
   drawn above its neighbors' instead of underneath. */
.about-detail-nav-btn {
  position: relative;
  display: inline-block;
  background: var(--color-surface);
  color: var(--color-brand-about);
  border: 1px solid var(--color-brand-about);
  border-radius: 0;
  padding: 14px 60px;
  text-decoration: none;
  cursor: pointer;
}

.about-detail-nav-btn:not(:first-child) {
  margin-left: -1px;
}

.about-detail-nav-btn:hover,
.about-detail-nav-btn.active {
  z-index: 1;
}

.about-detail-nav-btn.active {
  background: var(--color-brand-about);
  color: var(--color-on-brand-about);
}

/* Body box/font/v-html paragraph-spacing rules live in
   TemplateDetailBody.vue now — only this template's own per-block spacing
   and the alinea indent (first block only) stay here. */
.about-detail-paragraph + .about-detail-paragraph {
  margin-top: 1em;
}

.about-detail-figure {
  margin: 2em 0 0;
}

.about-detail-figure img {
  display: block;
  width: 100%;
  height: auto;
}

.about-detail-figure figcaption {
  margin-top: 8px;
}

.about-detail-alinea :deep(:first-child) {
  text-indent: 2em;
}

/* No mobile maquette shows this page's content state (only its Index/Team
   state, covered by InfoPanel.vue's own mobile media query) — this is a
   reasonable responsive extrapolation, not a pixel match: the fixed
   padding:14px 60px tabs would overflow/clip at phone width otherwise. */
@media (max-width: 1150px) {
  /* Title at an opened resource's own title size (TemplateRessource.vue,
     48px); subtitle at a heading-2 size (1.5em of the 16px base). */
  .about-detail-subtitle {
    max-width: 90%;
  }

  .about-detail-nav {
    flex-wrap: wrap;
  }

  .about-detail-nav-btn {
    padding: 10px 18px;
  }
}
</style>
