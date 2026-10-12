<script setup lang="ts">
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
    paragraph_1_title?: string
    paragraph_1_content?: ContentBlock[]
    paragraph_2_title?: string
    paragraph_2_content?: ContentBlock[]
    paragraph_3_title?: string
    paragraph_3_content?: ContentBlock[]
  }
  siteTitle: string
}>()

// 3 paragraphs, each keyed by its own title (the tab's own label — the
// only place that title shows now, not repeated as a heading above the
// text too). Only 'text' blocks render (same scope boundary as
// TemplateDefault.vue's own article body; paragraph_1_content's own
// inline "image" block isn't resolved/shown yet).
const paragraphs = computed(() =>
  [
    { title: props.page.paragraph_1_title, content: props.page.paragraph_1_content },
    { title: props.page.paragraph_2_title, content: props.page.paragraph_2_content },
    { title: props.page.paragraph_3_title, content: props.page.paragraph_3_content },
  ]
    .filter((p): p is { title: string, content: ContentBlock[] } => !!p.title)
    .map((p) => ({
      ...p,
      textBlocks: (p.content ?? []).filter((b) => b.type === 'text' && !b.isHidden),
    })),
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
        <h1 class="about-detail-title">{{ siteTitle }}</h1>
        <p v-if="page.header_subtitle" class="about-detail-subtitle">{{ page.header_subtitle }}</p>
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
          class="about-detail-nav-btn"
          :class="{ active: activeIndex === index }"
          @click="activeIndex = index"
        >
          {{ section.title }}
        </button>
      </nav>

      <TemplateDetailBody color="var(--color-brand-about)">
        <section v-if="paragraphs[activeIndex]">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            v-for="(block, bIndex) in paragraphs[activeIndex]!.textBlocks"
            :key="bIndex"
            class="about-detail-paragraph"
            :class="{ 'about-detail-alinea': bIndex === 0 }"
            v-html="block.content?.text"
          />
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
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 48px;
}

.about-detail-subtitle {
  margin: 10px auto 0;
  max-width: 60%;
  color: var(--color-brand-about);
  font-family: var(--font-serif);
  font-size: 28pt;
  line-height: 1.4;
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
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 400;
  font-size: 14pt;
  text-transform: uppercase;
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
  color: var(--color-surface);
}

/* Body box/font/v-html paragraph-spacing rules live in
   TemplateDetailBody.vue now — only this template's own per-block spacing
   and the alinea indent (first block only) stay here. */
.about-detail-paragraph + .about-detail-paragraph {
  margin-top: 1em;
}

.about-detail-alinea :deep(:first-child) {
  text-indent: 2em;
}

/* No mobile maquette shows this page's content state (only its Index/Team
   state, covered by InfoPanel.vue's own mobile media query) — this is a
   reasonable responsive extrapolation, not a pixel match: the fixed
   padding:14px 60px tabs would overflow/clip at phone width otherwise. */
@media (max-width: 768px) {
  .about-detail-title {
    font-size: 30px;
  }

  .about-detail-subtitle {
    max-width: 90%;
    font-size: 16pt;
  }

  .about-detail-nav {
    flex-wrap: wrap;
  }

  .about-detail-nav-btn {
    padding: 10px 18px;
    font-size: 11pt;
  }
}
</style>
