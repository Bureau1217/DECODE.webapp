<script setup lang="ts">
// Index is the default you land on; Visual is the alternative on the same
// side; Reading mode is its own independent toggle on the right, not part
// of that pair. Both shared (app.vue and/or KeywordsPanel.vue react to
// them), not local state.
const displayMode = useDisplayMode()
const readingMode = useReadingMode()

// Below 768px, INDEX stops being the Index/Visual display-mode pair's own
// "Index" option (Visual doesn't exist on mobile at all — see the
// isToolsSection-style v-if below) and instead becomes a full-view toggle
// — swap in whichever info panel the current route has (InfoPanel.vue's
// mobile media query), in place of the page's main content
// (app.vue/TemplateToolPageLayout.vue's own mobile overrides). Reading
// mode has nothing to shrink on mobile either (no side-by-side split to
// begin with), so it's hidden there too, same as Visual.
const isMobile = useIsMobile()
const mobileIndexOpen = useMobileIndexOpen()
function onIndexClick() {
  if (isMobile.value) {
    mobileIndexOpen.value = !mobileIndexOpen.value
  } else {
    displayMode.value = 'index'
  }
}

// B8A084 only on /resources (its own grid of bordered cards reads better
// against that color), 775937 only on /about (that page's own accent) —
// white everywhere else, the divider's original color.
const route = useRoute()
const isResourcesPage = computed(() => route.path === '/resources')
const isAboutPage = computed(() => route.path === '/about')
const isHomePage = computed(() => route.path === '/')
// A custom tool page reskins this bar in its own accent instead of
// brown — each tool page gets its own exit button (TemplateToolPageLayout.
// vue, top-right corner) rather than this bar.
const { theme, isThemed } = useToolTheme()
// No tool has a "visual" layout to switch to (unlike guide/resources'
// card grids) — across /tools and its sub-pages the toggle stays in
// place but grayed out and disabled, rather than vanishing from the bar.
const isToolsSection = computed(() => route.path.startsWith('/tools'))
// Splash -> home draw-in: as SiteNav's tabs rise out of the splash's
// baseline, the bar fills in brown from left to right underneath.
const introTransition = useIntroTransition()
</script>

<template>
  <div
    class="index-bar"
    :class="{ 'is-tool-themed': isThemed, 'is-intro': introTransition }"
    :style="{ '--local-accent': theme?.chromeAccent, '--local-accent-text': theme?.chromeText }"
  >
    <div class="index-bar-group">
      <button
        type="button"
        class="index-bar-item index-bar-index"
        :class="{ active: isMobile ? mobileIndexOpen : displayMode === 'index' }"
        @click="onIndexClick"
      >
        <span class="index-bar-dot" aria-hidden="true" />
        Index
      </button>
      <button
        type="button"
        class="index-bar-item index-bar-visual"
        :class="{ active: !isToolsSection && displayMode === 'visual' }"
        :disabled="isToolsSection"
        @click="displayMode = 'visual'"
      >
        <span class="index-bar-dot" aria-hidden="true" />
        Visual
      </button>
    </div>

    <!-- Anchored to the bar's own center, then pulled further left of it —
         not simply centered (desktop only — below 768px this becomes the
         index bar's own second half, see the media query below). -->
    <button type="button" class="index-bar-item index-bar-search" :class="{ 'reading-mode': readingMode }">
      <span class="index-bar-dot" aria-hidden="true" />
      Search
    </button>

    <button
      type="button"
      class="index-bar-item index-bar-reading"
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
  <div
    class="index-bar-divider"
    :class="{ 'reading-mode': readingMode, 'is-tool-themed': isThemed }"
    :style="{ '--local-accent-text': theme?.chromeText }"
    aria-hidden="true"
  />
  <div
    class="content-divider"
    :class="{ 'is-resources': isResourcesPage, 'is-about': isAboutPage, 'is-home': isHomePage, 'reading-mode': readingMode}"
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
  background: var(--color-chrome);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  box-sizing: border-box;
}

.index-bar.is-intro {
  animation: index-bar-fill 1s cubic-bezier(0.45, 0, 0.2, 1) 0.4s both;
}

@keyframes index-bar-fill {
  from {
    clip-path: inset(0 100% 0 0);
  }

  to {
    clip-path: inset(0 0 0 0);
  }
}

.index-bar.is-tool-themed {
  background: var(--local-accent);
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
  font-family: var(--font-mono);
  font-size: 12pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-on-fill);
  cursor: pointer;
}

/* Visual on /tools (script, isToolsSection): nothing to switch to. */
.index-bar-item:disabled {
  opacity: 0.4;
  cursor: default;
}

/* Centered on the bar, then pulled left of that center point — not just
   centered. */
.index-bar-search {
  position: absolute;
  left: 50%;
  transform: translateX(-130%);
  transition: left 0.5s ease;
}

/* Reading mode narrows the keywords panel to 25vw — SEARCH and the bar's
   own divider follow its new edge (also the end of the first nav tab),
   in step with the panel's own 0.5s width transition. */
.index-bar-search.reading-mode {
  left: 25%;
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
  border: 1px solid var(--color-on-fill);
  background: transparent;
  transition: background-color 0.15s ease;
}

.index-bar-item.active .index-bar-dot {
  background-color: var(--color-on-fill);
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
  transition: left 0.5s ease;
  width: 1px;
  background: var(--color-chrome-divider);
  z-index: 3;
}

/* Dark mode on a tool page: the tabs are outlined in the tool's own text
   shade (SiteNav.vue), so the dividers follow it rather than the tan. */
:root[data-theme='dark'] .index-bar-divider.is-tool-themed {
  background: var(--local-accent-text);
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
  background: var(--color-surface);
  z-index: 3;
  transition: left 0.5s ease;
}

.index-bar-divider.reading-mode {
  left: calc(25% - 0.5px);
}

.content-divider.reading-mode {
  left: calc(25vw - 0.5px);
}

.content-divider.is-resources {
  background: var(--color-brand-resources);
}

.content-divider.is-about,
.content-divider.is-home {
  background: var(--color-brand);
}

/* Below 768px: just INDEX | SEARCH, each half the bar (mirrors
   .index-bar-divider above, which already sits at the viewport's own
   center — no change needed there). Visual has nothing to switch to on
   mobile (no permanent side panel to reformat) and Reading mode has
   nothing to shrink (no side-by-side split to begin with) — both hidden.
   .content-divider tracks the desktop 50vw/25vw panel boundary, which
   doesn't exist on mobile either. */
@media (max-width: 768px) {
  .index-bar-divider.reading-mode {
    left: calc(50% - 0.5px);
  }

  /* White rule under the bar, separating it from the page content. */
  .index-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0;
    border-bottom: 1px solid var(--color-chrome-divider);
  }

  /* Dark mode: a top rule too, in the same brown as the tabs' outline —
     the dark bar otherwise has no edge against the ticker beside the
     MENU tab. */
  :root[data-theme='dark'] .index-bar {
    border-top: 1px solid var(--color-chrome-divider);
  }

  :root[data-theme='dark'] .index-bar.is-tool-themed {
    border-top-color: var(--local-accent-text);
    border-bottom-color: var(--local-accent-text);
  }

  .index-bar-group {
    padding-left: 12px;
  }

  .index-bar-visual,
  .index-bar-reading {
    display: none;
  }

  .index-bar-search {
    position: static;
    transform: none;
    width: 100%;
    justify-content: flex-end;
    padding-right: 12px;
  }

  .content-divider {
    display: none;
  }
}
</style>
