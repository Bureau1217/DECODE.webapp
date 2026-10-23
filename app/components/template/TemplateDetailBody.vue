<script setup lang="ts">
// Shared "rich text body" shell for the 3 detail templates (TemplateDefault
// article, TemplateRessource, TemplateAbout) — identical padding/font/
// line-height and identical v-html paragraph-spacing rules (:deep(p),
// :deep(p + p)) were duplicated byte-for-byte across all 3's own scoped
// CSS, just under different class names. `color` is the panel's own text
// color (the same value each consumer already passes to DetailPanelChrome's
// own text-color prop). Each consumer's own per-block markup (an h2 title
// per block, an "alinéa" first-line indent on the opening paragraph, a
// single plain blob) stays local — those genuinely differ per template.
defineProps<{
  color: string
}>()
</script>

<template>
  <div class="detail-body text-body" :style="{ color }">
    <slot />
  </div>
</template>

<style scoped>
.detail-body {
  padding: 40px 10% 0;
}

.detail-body :deep(p) {
  margin: 0;
}

.detail-body :deep(p + p) {
  margin-top: 1em;
}

/* 6%, not 10% — matches the tighter left margin the mobile maquettes use
   for body copy (Chapitre.png) now that the cover image/title above it
   (TemplateDefault.vue) also bleed closer to the edges instead of the
   desktop's generous 10-20% frame. Shared by TemplateDefault/
   TemplateRessource/TemplateAbout, all 3 consumers of this shell. */
@media (max-width: 768px) {
  .detail-body {
    padding: 28px 6% 0;
  }
}
</style>
