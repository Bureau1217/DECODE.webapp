<script setup lang="ts">
// Shared shell for every fixed left-hand info panel (KeywordsPanel,
// TeamPanel, CampaignInfoPanel, BotTrollCriteriaPanel,
// SourceDatabasePanel) — the position/width/reading-mode/scroll
// behavior was byte-identical across all 5. Header/row styling stays
// local to each consumer via its own scoped CSS targeting its own
// class (passed in via the fallthrough `class` attr, merged onto this
// component's root): their colors, sizes and hover tints genuinely
// differ (BotTrollCriteriaPanel's category band is a different height
// and color scheme than KeywordsPanel's; SourceDatabasePanel's rows
// are a CSS grid table, not <li> rows at all) — forcing those into one
// generic shape would risk visual regressions for a cosmetic saving.
defineProps<{ readingMode?: boolean }>()

// Below 768px there's no side-by-side split to shrink/grow (reading-mode
// is desktop-only, see the media query below) — instead this panel is
// either the whole screen (INDEX tapped) or not rendered at all, toggled
// by the same state SiteIndexBar.vue's own INDEX button writes to. Every
// InfoPanel consumer (KeywordsPanel/TeamPanel/CampaignInfoPanel/
// BotTrollCriteriaPanel/SourceDatabasePanel) gets this for free from the
// shared shell, no per-consumer change needed.
const mobileIndexOpen = useMobileIndexOpen()
</script>

<template>
  <!-- text-row: what every panel's rows read in (main.css type scale);
       bands and popups set their own. -->
  <aside class="info-panel text-row" :class="{ 'reading-mode': readingMode, 'mobile-open': mobileIndexOpen }">
    <slot />
  </aside>
</template>

<style scoped>
.info-panel {
  position: fixed;
  z-index: 1;
  left: 0;
  top: 8.5vh;
  /* Ends at the fixed footer, so the last rows can scroll clear of it. */
  bottom: var(--footer-height);
  width: 50vw;
  overflow-y: auto;
  background: var(--color-surface);
  transition: width 0.5s ease;
}

.info-panel.reading-mode {
  width: 25vw;
}

@media (max-width: 768px) {
  .info-panel {
    top: 8.5vh;
    bottom: var(--footer-height);
    width: 100%;
    /* Slides up from just below the viewport into view, instead of an
       instant display swap — an actual visible scroll/slide, matching
       the content's own slide-out-upward in the opposite direction
       (app.vue's own .app-content, TemplateToolPageLayout.vue's own
       .tool-page-content — same transform/transition pair). Still a
       `position: fixed` box clipped by the viewport, not reachable by
       scrolling the page itself while off-screen — only the INDEX
       button's own toggle moves it. */
    transform: translateY(100%);
    transition: transform 0.4s ease;
    pointer-events: none;
  }

  .info-panel.mobile-open {
    transform: translateY(0);
    pointer-events: auto;
  }
}
</style>
