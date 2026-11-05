<script setup lang="ts">
import { decipherHtml } from '~/utils/decipher'

// A keyword, opened in the right panel the way a resource is
// (TemplateRessource.vue).
const props = defineProps<{
  page: {
    title: string
    slug: string
    description?: string
    image?: { url: string, alt?: string, width?: number, height?: number }[]
  }
  id: string
  category?: string
  closeTo: string
  prevTo?: string | null
  nextTo?: string | null
  relatedArticles?: { title: string, to: string }[]
  relatedResources?: { title: string, to: string }[]
}>()

const language = useLanguage()

const { drawState, bodyDecipher, root, close } = useDetailTransition(() => props.id, props.closeTo, '.tag-detail-description')
</script>

<template>
  <DetailPanelChrome background="var(--color-surface)" text-color="var(--color-brand-about)" :close-to="closeTo" :prev-to="prevTo" :next-to="nextTo" :close-draw="drawState" :on-close="close">
    <article ref="root" class="tag-detail" :class="`detail-lines-${drawState}`">
      <header class="tag-detail-header">
        <div />
        <h1 class="tag-detail-title text-h1"><DecipherText :text="page.title" /></h1>
        <div class="tag-detail-meta">
          <span v-if="category" class="tag-detail-type text-tag">{{ category }}</span>
        </div>
      </header>

      <!-- Between the two dividers, where a resource has its button. -->
      <TemplateDividerBand class="tag-detail-band" color="var(--color-brand-resources)">
        <div v-if="page.image?.length" class="tag-detail-images">
          <img v-for="img in page.image" :key="img.url" loading="lazy" :src="img.url" :alt="cleanAlt(img.alt, page.title)" :style="{ '--ratio': img.width && img.height ? img.width / img.height : 1 }">
        </div>
      </TemplateDividerBand>

      <TemplateDetailBody v-if="page.description" color="var(--color-brand-about)">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="tag-detail-description" v-decipher="bodyDecipher" v-html="decipherHtml(page.description)" />
      </TemplateDetailBody>
      <DetailLinks :label="language === 'fr' ? 'Dans le guide' : 'In the guide'" :items="relatedArticles ?? []" />
      <DetailLinks :label="language === 'fr' ? 'Ressources' : 'Resources'" :items="relatedResources ?? []" />
    </article>
  </DetailPanelChrome>
</template>

<style scoped>
/* Same header as TemplateRessource.vue: the title centered in a fixed box, so
   the divider below it never moves from one keyword to the next. */
.tag-detail-header {
  height: max(32vh, 220px);
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  justify-items: center;
  padding: 0 8%;
  text-align: center;
}

.tag-detail-title {
  margin: 0;
  color: var(--color-brand-about);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.tag-detail-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tag-detail-type {
  display: inline-block;
  margin-top: 16px;
  padding: 2px;
  background: var(--color-brand-resources);
  color: var(--color-on-fill);
}

.tag-detail-band {
  margin-top: 0;
}

/* The band's own height is for one line of button: the visuals set it here. */
.tag-detail-band :deep(.divider-band-row) {
  height: auto;
  min-height: 10vh;
}

.tag-detail-images {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 20px 10px;
  box-sizing: border-box;
}

.tag-detail-images img {
  height: 18vh;
  width: auto;
  max-width: 100%;
  object-fit: cover;
  display: block;
}

/* One row, never wrapped. Each starts at its size above and they shrink in
   proportion to fit, so they stay the same height and nothing gets cropped. */
@media (max-width: 1150px) {
  .tag-detail-images {
    flex-wrap: nowrap;
    align-items: flex-start;
  }

  .tag-detail-images img {
    flex: 0 1 calc(var(--ratio) * 18vh);
    min-width: 0;
    height: auto;
    aspect-ratio: var(--ratio);
  }
}
</style>
