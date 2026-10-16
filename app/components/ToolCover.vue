<script setup lang="ts">
import { decipherHtml } from '~/utils/decipher'
// Entrance state of the DE.CO.DE Extension and Bot / Troll Detector pages
// (TemplateToolPageLayout.vue's `intro.cover`, the fill color): the same
// layout as an opened resource (TemplateRessource.vue): the tool's name
// as the H1, its authors underneath, the Start button between two
// divider rules, then the description. It sits in the content column
// beside the tool's own left panel, filled with the tool's own color, with all
// type in --tool-cover-text instead of the resource page's brown on white.
defineProps<{
  title: string
  description?: string
  credits?: string
  // Tool fill (main.css token); every text/rule sits on it in --tool-cover-text.
  fill: string
}>()

defineEmits<{
  start: []
}>()
</script>

<template>
  <div class="tool-cover" :style="{ '--cover-fill': fill }">
    <header class="tool-cover-header">
      <div />
      <h1 class="tool-cover-title"><DecipherText :text="title" /></h1>
      <p v-if="credits" class="tool-cover-credits">Idea by {{ credits }}</p>
    </header>

    <TemplateDividerBand color="var(--tool-cover-text)">
      <button type="button" class="tool-cover-start" @click="$emit('start')">
        Start
      </button>
    </TemplateDividerBand>

    <TemplateDetailBody v-if="description" color="var(--tool-cover-text)" class="tool-cover-body">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-decipher v-html="decipherHtml(description)" />
    </TemplateDetailBody>
  </div>
</template>

<style scoped>
/* Same box as DetailPanelChrome.vue's own panel: exactly the space
   between SiteNav/SiteIndexBar and SiteFooter, scrolling inside. */
.tool-cover {
  height: calc(100vh - 8.5vh - var(--footer-height));
  overflow-y: auto;
  box-sizing: border-box;
  padding-bottom: 40px;
  background: var(--cover-fill);
  color: var(--tool-cover-text);
}

/* Same fixed 32vh header as TemplateRessource.vue: the title centered in
   it both ways whatever its line count, credits hanging below it. */
.tool-cover-header {
  height: 32vh;
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  justify-items: center;
  padding: 0 8%;
  text-align: center;
}

.tool-cover-title {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: 48px;
  line-height: 1.1;
}

.tool-cover-credits {
  margin: 10px 0 0;
  font-family: var(--font-mono);
  font-size: 12pt;
}

/* Inverse of the resource page's own outline action button: cover-text
   stroke on the tool color at rest, filled cover-text with the tool color
   as text on hover. */
.tool-cover-start {
  appearance: none;
  margin: auto;
  padding: 14px 48px;
  border: 1px solid var(--tool-cover-text);
  border-radius: 0;
  background: transparent;
  color: var(--tool-cover-text);
  font-family: var(--font-mono);
  font-size: 11pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tool-cover-start:hover,
.tool-cover-start:focus-visible {
  background: var(--tool-cover-text);
  color: var(--cover-fill);
}

/* The content column itself is the fixed full-screen box on mobile
   (TemplateToolPageLayout.vue), so this just fills it. */
@media (max-width: 768px) {
  .tool-cover {
    height: 100%;
  }

  .tool-cover-title {
    font-size: 34px;
  }
}
</style>
