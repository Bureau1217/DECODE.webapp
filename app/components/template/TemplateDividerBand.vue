<script setup lang="ts">
// Shared "divider band" shell — a horizontal rule, a content row, another
// horizontal rule — duplicated identically (height/margin/the 10vh row)
// in TemplateDefault.vue (article) and TemplateRessource.vue, just with a
// different divider color and completely different row content (a
// related-tool button beside a vertical divider vs. a single centered
// action link), which stays each consumer's own slot content. The row has
// no align-items/justify-content of its own (matching the article
// template's original default) — TemplateDefault's two half-width columns
// rely on that default `stretch` so their own vertical divider line still
// spans the row's full height; a consumer with simpler single-child
// content (TemplateRessource) centers that child itself instead.
defineProps<{
  color: string
}>()
</script>

<template>
  <div class="divider-band" :style="{ '--divider-color': color }">
    <div class="divider-band-line" />
    <div class="divider-band-row">
      <slot />
    </div>
    <div class="divider-band-line" />
  </div>
</template>

<style scoped>
.divider-band {
  margin-top: 40px;
}

.divider-band-line {
  height: 1px;
  margin: 0 10px;
  background: var(--divider-color);
}

.divider-band-row {
  height: 10vh;
  display: flex;
}

/* Edge to edge, not inset 10px each side — Chapitre.png's own mobile
   mockup draws these rules spanning the full card width, same reasoning
   as the article template's own cover image. */
@media (max-width: 768px) {
  .divider-band-line {
    margin: 0;
  }
}
</style>
