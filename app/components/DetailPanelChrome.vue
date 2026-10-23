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
  // Close cross drawn in like a trim path (TemplateDefault.vue's article
  // arrival): 'pending' keeps it undrawn, 'draw' traces its two strokes,
  // 'undraw' retracts them (on closing).
  closeDraw?: 'pending' | 'draw' | 'undraw' | null
  // Intercepts the close cross (TemplateDefault.vue's closing transition);
  // it calls preventDefault itself when it takes over the navigation.
  onClose?: (event: MouseEvent) => void
}>()
</script>

<template>
  <div class="detail-panel" :style="{ background, color: textColor }">
    <NuxtLink
      v-if="closeTo"
      :to="closeTo"
      class="detail-panel-close"
      :class="closeDraw ? `is-${closeDraw}` : null"
      aria-label="Close"
      @click.capture="onClose?.($event)"
    >
      <!-- A drawn cross (thin stroke, square linecap), not a font glyph —
           the "×" character renders visibly rounded/bold at larger sizes
           in Martian Mono, not the slim square cross asked for. -->
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" pathLength="1" />
        <line x1="22" y1="2" x2="2" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" pathLength="1" />
      </svg>
    </NuxtLink>
    <div class="detail-panel-scroll">
      <div class="detail-panel-scroll-inner">
        <slot />
        <div class="detail-panel-nav">
          <NuxtLink v-if="prevTo" :to="prevTo" class="detail-panel-nav-btn text-label detail-panel-nav-prev">Previous</NuxtLink>
          <span v-else />
          <NuxtLink v-if="nextTo" :to="nextTo" class="detail-panel-nav-btn text-label detail-panel-nav-next">Next</NuxtLink>
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

/* closeDraw: each stroke traces from its start, the second just after
   the first. stroke-linecap square would show a dot at length 0, hence
   the butt cap while drawing. */
.detail-panel-close.is-pending line,
.detail-panel-close.is-draw line,
.detail-panel-close.is-undraw line {
  stroke-dasharray: 1;
  stroke-linecap: butt;
}

.detail-panel-close.is-pending line {
  stroke-dashoffset: 1;
}

.detail-panel-close.is-draw line {
  animation: detail-close-draw 0.45s cubic-bezier(0.45, 0, 0.25, 1) both;
}

.detail-panel-close.is-draw line + line {
  animation-delay: 0.25s;
}

.detail-panel-close.is-undraw line {
  animation: detail-close-undraw 0.35s cubic-bezier(0.55, 0, 0.75, 0.2) 0.15s both;
}

.detail-panel-close.is-undraw line + line {
  animation-delay: 0s;
}

@keyframes detail-close-undraw {
  from {
    stroke-dashoffset: 0;
  }

  to {
    stroke-dashoffset: 1;
  }
}

@keyframes detail-close-draw {
  from {
    stroke-dashoffset: 1;
  }

  to {
    stroke-dashoffset: 0;
  }
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

/* The panel already stops at the footer's top edge (its own height
   excludes it), so the bottom gap here mirrors the close cross's own top
   gap (8px offset + its 36px box centering a 26px icon) — Previous/Next
   sit as far from the panel's bottom as the cross does from its top. */
.detail-panel-nav {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  padding: 8px 24px 12px;
}

.detail-panel-nav-btn {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 768px) {
  .detail-panel-nav {
    padding: 8px 14px 12px;
  }
}
</style>
