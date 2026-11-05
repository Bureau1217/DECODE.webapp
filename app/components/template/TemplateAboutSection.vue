<script setup lang="ts">
import { decipherHtml } from '~/utils/decipher'

// Legal terms or Credits, in the right panel beside the team.
const props = defineProps<{
  title: string
  blocks: ContentBlock[]
}>()

const textBlocks = computed(() => props.blocks.filter((b) => b.type === 'text' && !b.isHidden))
</script>

<template>
  <DetailPanelChrome background="var(--color-surface)" text-color="var(--color-brand-about)" close-to="/about">
    <article class="about-section">
      <header class="about-section-header">
        <h1 class="about-section-title text-h1"><DecipherText :text="title" /></h1>
      </header>
      <TemplateDetailBody class="about-section-body" color="var(--color-brand-about)">
        <section v-for="(block, index) in textBlocks" :key="index" class="about-section-block">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <h2 v-if="block.content?.title" class="about-section-block-title" v-decipher v-html="decipherHtml(block.content.title)" />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-decipher v-html="decipherHtml(block.content?.text)" />
        </section>
      </TemplateDetailBody>
    </article>
  </DetailPanelChrome>
</template>

<style scoped>
.about-section-header {
  text-align: center;
  padding: 5% 8% 0;
}

.about-section-title {
  margin: 0;
  color: var(--color-brand-about);
}

/* Reference text, read closer up than an article: the panel's smaller size. */
.detail-body.about-section-body {
  font-size: 18px;
  line-height: 1.4;
  padding-bottom: 64px;
}

.about-section-block + .about-section-block {
  margin-top: 1.5em;
}

.about-section-block-title {
  margin: 0 0 0.3em;
  font: inherit;
  font-weight: 700;
}

.about-section-body :deep(a) {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
</style>
