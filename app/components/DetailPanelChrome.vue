<script setup lang="ts">
// Shared shell for both detail-panel variants (article, via
// TemplateDefault.vue; resource, via TemplateRessource.vue) — "a way of
// consulting them": a close cross back to the list, a scrollable content
// area (the slot — each variant owns its own layout inside it), and
// NEXT/PREVIOUS links that only appear once you've scrolled to the very
// end of the content, not fixed/sticky.
defineProps<{
  background: string
  textColor: string
  // Omit to hide the close cross entirely — TemplateAbout.vue's own use
  // of this shell isn't reached from a list the way article/resource
  // detail pages are, so there's nothing for a close action to go back to.
  closeTo?: string | null
  prevTo?: string | null
  nextTo?: string | null
}>()
</script>

<template>
  <div class="detail-panel" :style="{ background, color: textColor }">
    <NuxtLink v-if="closeTo" :to="closeTo" class="detail-panel-close" aria-label="Close">
      <!-- A drawn cross (thin stroke, square linecap), not a font glyph —
           the "×" character renders visibly rounded/bold at larger sizes
           in Martian Mono, not the slim square cross asked for. -->
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
        <line x1="22" y1="2" x2="2" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
    </NuxtLink>
    <div class="detail-panel-scroll">
      <div class="detail-panel-scroll-inner">
        <slot />
        <div class="detail-panel-nav">
          <NuxtLink v-if="prevTo" :to="prevTo" class="detail-panel-nav-btn detail-panel-nav-prev">Previous</NuxtLink>
          <span v-else />
          <NuxtLink v-if="nextTo" :to="nextTo" class="detail-panel-nav-btn detail-panel-nav-next">Next</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Fills exactly the space between SiteNav/SiteIndexBar (8.5vh, top) and
   SiteFooter (var(--footer-height), bottom) — same formula as the guide
   grid (guide/index.vue). Not in KEYWORDS_PANEL_ROUTES (app.vue), so no
   left margin to account for — this always gets the full width. */
.detail-panel {
  position: relative;
  height: calc(100vh - 8.5vh - var(--footer-height));
  overflow: hidden;
}

/* The close cross stays fixed in place (not part of the scrolling
   content) — position:absolute on .detail-panel (which itself doesn't
   scroll), not on .detail-panel-scroll. */
.detail-panel-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  text-decoration: none;
}

.detail-panel-scroll {
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

/* min-height:100% + the nav's own margin-top:auto is what pins the nav
   row to the bottom when the slot content is shorter than the panel
   (e.g. a short resource description) — short content doesn't stretch
   this box, so the leftover space collapses onto that auto margin,
   pushing the row down to sit just above the footer. When content is
   taller than 100% (a long article), this box just grows past it instead
   — the row stays right after the content, reachable only by actually
   scrolling to the end, same as before. */
.detail-panel-scroll-inner {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* bottom is exactly the footer's own height — no extra gap, as close to
   it as without overlapping. */
.detail-panel-nav {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  padding: 8px 24px var(--footer-height);
}

.detail-panel-nav-btn {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 16pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: inherit;
  text-decoration: none;
}
</style>
