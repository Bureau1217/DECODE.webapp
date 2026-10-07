<script setup lang="ts">
// Purely a view-mode switch for now (no content wiring yet, same "visual
// only" status as the footer's own dark-mode toggle) — Index is the
// default you land on; Visual is the alternative on the same side;
// Reading mode is its own independent toggle on the right, not part of
// that pair.
type DisplayMode = 'index' | 'visual'
const displayMode = ref<DisplayMode>('index')
const readingMode = ref(false)
</script>

<template>
  <div class="index-bar">
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

  <!-- Fixed, not confined to .index-bar's own box — starts at this bar's
       top edge (5vh: SiteNav's 1.5vh top margin + 3.5vh height) and runs
       to the viewport's own bottom edge, independent of page scroll
       height. z-index sits above the plain brown rectangle (unpositioned,
       stacking level 0) but below .site-footer (see its own z-index). -->
  <div class="index-bar-divider" aria-hidden="true" />
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
  bottom: 0;
  left: calc(50% - 0.5px);
  width: 1px;
  background: #fff;
  z-index: 3;
}
</style>
