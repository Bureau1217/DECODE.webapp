<script setup lang="ts">
// Shared layout for the 3 custom tool pages (TemplateCampaignsMap.vue,
// TemplateBotTrollDetector.vue, TemplateSourceReliability.vue): a fixed
// left panel (InfoPanel-based — passed in via the `panel` slot) and an
// offset right content column reacting to the same readingMode state,
// both kept at the exact formula used throughout the site (SiteNav +
// SiteIndexBar = 8.5vh, SiteFooter = var(--footer-height)).
// `scrollable` (default true) gives the content column `min-height` +
// `overflow-y: auto`, like BotTrollAccountPanel/SourcePluginInfoPanel's
// own prose content. TemplateCampaignsMap.vue passes `:scrollable="false"`
// instead — DisinfoMap needs to exactly fill a fixed `height`, not scroll
// past it (a map has no "more content below the fold" to reveal).
withDefaults(defineProps<{
  readingMode?: boolean
  scrollable?: boolean
}>(), {
  readingMode: false,
  scrollable: true,
})

// Same mobile INDEX/content swap as app.vue's own .app-content/InfoPanel
// pair — this layout reimplements that identical 50vw-panel/offset-
// content split independently (see the file-top comment), so it needs
// the same mobile override independently too.
const mobileIndexOpen = useMobileIndexOpen()
</script>

<template>
  <div class="tool-page">
    <slot name="panel" />
    <div
      class="tool-page-content"
      :class="{ 'reading-mode': readingMode, scrollable, 'mobile-index-open': mobileIndexOpen }"
    >
      <slot name="content" />
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  position: relative;
}

.tool-page-content {
  margin-left: 50vw;
  transition: margin-left 0.5s ease;
}

.tool-page-content.reading-mode {
  margin-left: 25vw;
}

.tool-page-content.scrollable {
  min-height: calc(100vh - 8.5vh - var(--footer-height));
  overflow-y: auto;
}

.tool-page-content:not(.scrollable) {
  height: calc(100vh - 8.5vh - var(--footer-height));
}

/* No side-by-side split below 768px — same reasoning as app.vue's own
   .app-content mobile override: the panel slot (InfoPanel.vue-based,
   same mobile media query) takes the full screen instead of a 50vw/25vw
   slice beside this, and the two slide vertically past each other (a
   visible scroll/slide, not an instant display swap) when the same
   mobile-index-open state toggles. */
@media (max-width: 768px) {
  .tool-page-content,
  .tool-page-content.reading-mode {
    margin-left: 0;
    position: fixed;
    top: 8.5vh;
    bottom: var(--footer-height);
    left: 0;
    width: 100%;
    transform: translateY(0);
    transition: transform 0.4s ease;
  }

  .tool-page-content.scrollable {
    min-height: 0;
    height: auto;
  }

  .tool-page-content:not(.scrollable) {
    height: auto;
  }

  .tool-page-content.mobile-index-open {
    transform: translateY(-100%);
    pointer-events: none;
  }
}
</style>
