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
// `exit` is the top-right close cross (ToolExitButton.vue) every tool
// page gets, in that tool's own colors. `intro` (optional) is the
// entrance state until Start: ToolIntro.vue in the left panel's place,
// a Start button (filled with `start`) in the content column's — or,
// with `cover: true`, the tool's own `panel` slot stays on the left with
// its entries emptied (slot prop `empty`), and the content column shows
// ToolCover.vue (a resource-page-style screen filled with `cover`, the
// tool's own fill color).
// Start fills the entries in.
const props = withDefaults(defineProps<{
  readingMode?: boolean
  scrollable?: boolean
  exit: { accent: string, textColor?: string }
  intro?: { title: string, description?: string, credits?: string, band: string, bandText: string, start: string, cover?: string } | null
}>(), {
  readingMode: false,
  scrollable: true,
  intro: null,
})

// Per visit, not remembered — arriving at the tool again shows the
// entrance screen again.
const started = ref(!props.intro)

// Same mobile INDEX/content swap as app.vue's own .app-content/InfoPanel
// pair — this layout reimplements that identical 50vw-panel/offset-
// content split independently (see the file-top comment), so it needs
// the same mobile override independently too.
const mobileIndexOpen = useMobileIndexOpen()
</script>

<template>
  <div class="tool-page">
    <!-- Cover intros keep the tool's own panel mounted throughout: it shows
         its entries emptied ("-") until Start, then fills them in. -->
    <ToolIntro
      v-if="intro && !intro.cover && !started"
      :title="intro.title"
      :description="intro.description"
      :credits="intro.credits"
      :band="intro.band"
      :band-text="intro.bandText"
    />
    <slot v-else name="panel" :empty="!started" />

    <div
      v-if="intro && !started && intro.cover"
      class="tool-page-content"
      :class="{ 'reading-mode': readingMode, 'mobile-index-open': mobileIndexOpen }"
    >
      <ToolCover
        :title="intro.title"
        :description="intro.description"
        :credits="intro.credits"
        :fill="intro.cover"
        @start="started = true"
      />
    </div>
    <div
      v-else-if="intro && !started"
      class="tool-page-content tool-page-start"
      :class="{ 'reading-mode': readingMode, 'mobile-index-open': mobileIndexOpen }"
    >
      <button type="button" class="tool-page-start-btn btn-fill" :style="{ '--btn-fill': intro.start }" @click="started = true">
        Start
      </button>
    </div>
    <div
      v-else
      class="tool-page-content"
      :class="{ 'reading-mode': readingMode, scrollable, 'mobile-index-open': mobileIndexOpen }"
    >
      <slot name="content" />
    </div>
    <!-- Outside .tool-page-content on purpose: that column is transformed
         on mobile (its INDEX slide), which would make it the containing
         block for this fixed button instead of the viewport. -->
    <ToolExitButton class="tool-page-exit" :accent="exit.accent" :text-color="exit.textColor" />
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

/* Entrance state's right column — just the Start button, centered.
   Same shape as Splash.vue's own CTA; fill/hover from .btn-fill. */
.tool-page-start {
  height: calc(100vh - 8.5vh - var(--footer-height));
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-page-start-btn {
  appearance: none;
  border-radius: 0;
  padding: 18px 48px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12pt;
  text-transform: uppercase;
  cursor: pointer;
}

/* Viewport's top-right corner, just under SiteNav + SiteIndexBar (8.5vh)
   — same spot whether the content column scrolls or not, and above
   DisinfoMap.vue's own overlays (z-index 2). */
.tool-page-exit {
  position: fixed;
  top: calc(8.5vh + 14px);
  right: 14px;
  z-index: 3;
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
    overflow-x: hidden;
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
