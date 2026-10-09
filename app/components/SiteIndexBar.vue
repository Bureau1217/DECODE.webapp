<script setup lang="ts">
// Index is the default you land on; Visual is the alternative on the same
// side; Reading mode is its own independent toggle on the right, not part
// of that pair. Both shared (app.vue and/or KeywordsPanel.vue react to
// them), not local state.
const displayMode = useDisplayMode()
const readingMode = useReadingMode()

// B8A084 only on /resources (its own grid of bordered cards reads better
// against that color), 775937 only on /about (that page's own accent) —
// white everywhere else, the divider's original color.
const route = useRoute()
const isResourcesPage = computed(() => route.path === '/resources')
const isAboutPage = computed(() => route.path === '/about')
// Coral (FC7C6A) instead of brown while the Campaigns Maps tool is open —
// the map itself gets its own exit button (DisinfoMap.vue, top-right
// corner, same margin as MapFilters.vue) rather than this bar.
const isCampaignsMapPage = computed(() => route.path === '/tools/campaigns-map')
// Same reskin, teal — Bot / Troll Detector's own accent.
const isBotTrollDetectorPage = computed(() => route.path === '/tools/bot-troll-detector')
// No tool has a "visual" layout to switch to (unlike guide/resources'
// card grids) — hide the toggle across /tools and its sub-pages rather
// than leaving a non-functional button.
const isToolsSection = computed(() => route.path.startsWith('/tools'))
</script>

<template>
  <div class="index-bar" :class="{ 'is-campaigns-map': isCampaignsMapPage, 'is-bot-troll': isBotTrollDetectorPage }">
    <div class="index-bar-group">
      <button
        type="button"
        class="index-bar-item"
        :class="{ active: displayMode === 'index' }"
        @click="displayMode = 'index'"
      >
        <span class="index-bar-dot" aria-hidden="true" />
        Index
      </button>
      <button
        v-if="!isToolsSection"
        type="button"
        class="index-bar-item"
        :class="{ active: displayMode === 'visual' }"
        @click="displayMode = 'visual'"
      >
        <span class="index-bar-dot" aria-hidden="true" />
        Visual
      </button>
    </div>

    <!-- Anchored to the bar's own center, then pulled further left of it —
         not simply centered. -->
    <button type="button" class="index-bar-item index-bar-search">
      <span class="index-bar-dot" aria-hidden="true" />
      Search
    </button>

    <button
      type="button"
      class="index-bar-item"
      :class="{ active: readingMode }"
      @click="readingMode = !readingMode"
    >
      <span class="index-bar-dot" aria-hidden="true" />
      Reading mode
    </button>
  </div>

  <!-- Two segments, not one continuous line: the part crossing .index-bar
       itself (this bar's own top edge, 5vh, to its bottom, 8.5vh) is this
       bar's own chrome — stays white on every page. Only
       .content-divider, below that, picks up a page's own accent color
       (.is-resources). z-index sits above the plain brown rectangle
       (unpositioned, stacking level 0) but below .site-footer (its own
       z-index). -->
  <div class="index-bar-divider" aria-hidden="true" />
  <div
    class="content-divider"
    :class="{ 'is-resources': isResourcesPage, 'is-about': isAboutPage, 'reading-mode': readingMode }"
    aria-hidden="true"
  />
</template>

<style scoped>
/* Height matches SiteNav's own tab height (3.5% of viewport) — that one
   needs it in JS (the folder-tab SVG's diagonal geometry scales off it),
   this is a plain rectangle so the CSS unit alone is enough. */
.index-bar {
  position: fixed;
  top: 5vh;
  left: 0;
  /* Below .index-bar-divider (z-index 3) on purpose now — that divider is
     meant to visibly cross over this bar, not disappear behind it. */
  z-index: 2;
  width: 100vw;
  height: 3.5vh;
  background: #a68764;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  box-sizing: border-box;
}

.index-bar.is-campaigns-map {
  background: #fc7c6a;
}

.index-bar.is-bot-troll {
  background: #3fa396;
}

.index-bar-group {
  display: flex;
  align-items: center;
  gap: 28px;
}

.index-bar-item {
  appearance: none;
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'Martian Mono', monospace;
  font-size: 12pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #fff;
  cursor: pointer;
}

/* Centered on the bar, then pulled left of that center point — not just
   centered. */
.index-bar-search {
  position: absolute;
  left: 50%;
  transform: translateX(-130%);
}

/* Sized off the item's own font (1em = that font-size), so it scales
   with it rather than being a fixed px guess — same unit used for the
   footer's dark-mode dot. Unselected: stroke only. Selected (.active):
   filled solid — the footer's own dot stays static (no click wiring
   there), this is the same visual relationship, just actually
   interactive. */
.index-bar-dot {
  width: 1em;
  height: 1em;
  border-radius: 50%;
  border: 1px solid #fff;
  background: transparent;
  transition: background-color 0.15s ease;
}

.index-bar-item.active .index-bar-dot {
  background-color: #fff;
}

/* Above .index-bar (z-index 2) now — visibly crosses over the brown bar
   instead of disappearing behind it — but still below .site-footer
   (z-index 4), same reasoning as before: it should run behind the footer
   like the rest of the page's content does. */
.index-bar-divider {
  position: fixed;
  top: 5vh;
  height: 3.5vh;
  left: calc(50% - 0.5px);
  width: 1px;
  background: #fff;
  z-index: 3;
}

/* left tracks the keywords-panel/content boundary (KeywordsPanel.vue,
   app.vue — both 50vw normally, 25vw in reading mode) — transition here
   is what makes it slide smoothly in sync with that resize rather than
   jumping to the new position. */
.content-divider {
  position: fixed;
  top: 8.5vh;
  bottom: 0;
  left: calc(50vw - 0.5px);
  width: 1px;
  background: #fff;
  z-index: 3;
  transition: left 0.5s ease;
}

.content-divider.reading-mode {
  left: calc(25vw - 0.5px);
}

.content-divider.is-resources {
  background: #b8a084;
}

.content-divider.is-about {
  background: #a68764;
}
</style>
