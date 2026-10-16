<script setup lang="ts">
const showSplash = useSplashVisible()

// Light/dark theme (SiteFooter's toggle) — on <html> so main.css's
// `:root[data-theme='dark']` token block applies to the whole page,
// splash included.
const colorMode = useColorMode()
useHead({ htmlAttrs: { 'data-theme': colorMode } })

// Always visible (KeywordsPanel, below) on these — not on /keywords/*
// itself or individual tool pages, which weren't asked for. Still gated
// on !showSplash too: '/' matches this list, but shouldn't show the panel
// until the splash itself is dismissed. /guide and /resources are prefix
// matches (not just the exact list/index route) — an article or resource
// detail page (DetailPanelChrome.vue) should show it too, half-viewport
// same as the lists.
const route = useRoute()
const KEYWORDS_PANEL_EXACT_ROUTES = ['/', '/tools', '/about']
const KEYWORDS_PANEL_PREFIX_ROUTES = ['/guide', '/resources']
const showKeywordsPanel = computed(() => {
  if (showSplash.value) return false
  if (KEYWORDS_PANEL_EXACT_ROUTES.includes(route.path)) return true
  return KEYWORDS_PANEL_PREFIX_ROUTES.some((p) => route.path === p || route.path.startsWith(`${p}/`))
})

// SiteIndexBar's own "Reading mode" toggle — shrinks KeywordsPanel to
// 25vw (that component) and lets .app-content's own margin-left follow it
// down from 50vw to match, below.
const readingMode = useReadingMode()

// Splash -> home draw-in (pages/index.vue): the middle line, gone with
// the rest of the splash grid, draws back in from its centre at the
// keywords panel's right edge, then fades once the panel is complete.
const introTransition = useIntroTransition()

// /about shows TeamPanel (the about page's own "Équipes" field) in the
// same fixed half-viewport slot KeywordsPanel otherwise occupies there —
// never both at once.
const isAboutPage = computed(() => route.path === '/about')

// Mobile's INDEX/MENU toggles (SiteIndexBar.vue/SiteNav.vue) — reset on
// every navigation so arriving at a new page always shows its content
// first, never leaving a visitor stuck on the previous page's index/menu.
const mobileIndexOpen = useMobileIndexOpen()
const mobileMenuOpen = useMobileMenuOpen()
watch(
  () => route.path,
  () => {
    mobileIndexOpen.value = false
    mobileMenuOpen.value = false
  },
)
</script>

<template>
  <div class="app-shell">
    <!-- Hidden defs for the global image duotone treatment (app/assets/css/main.css).
         https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feComponentTransfer -->
    <svg width="0" height="0" style="position: absolute" aria-hidden="true">
      <filter id="duotone-silver">
        <!-- Rec.601 luma weights — a more photographically faithful
             grayscale conversion than a flat average, better preserving
             how skin/fabric/architecture read tonally. -->
        <feColorMatrix
          type="matrix"
          values="0.299 0.587 0.114 0 0
                  0.299 0.587 0.114 0 0
                  0.299 0.587 0.114 0 0
                  0     0     0     1 0"
        />
        <!-- Photographic-negative remap, not a fade: each channel's table
             is [highlight-target, shadow-target] — note the REVERSED
             order vs. a plain compression. Input 0 (original black) maps
             to the near-white end; input 1 (original white) maps to the
             darkest end. That's grayscale -> invert -> compress into the
             target band, folded into one continuous linear transform (no
             separate clip/posterize step, so every input luminance still
             maps to a distinct output — full tonal structure survives).
             Endpoints: originally-brightest content -> ~#9fa1a3 (darkest
             negative tone), originally-darkest content -> ~#f4f4f2
             (near-white), 50% luminance -> ~#cacccd. -->
        <feComponentTransfer color-interpolation-filters="sRGB">
          <feFuncR type="table" tableValues="0.95686 0.62353" />
          <feFuncG type="table" tableValues="0.95686 0.63137" />
          <feFuncB type="table" tableValues="0.94902 0.63922" />
        </feComponentTransfer>
      </filter>
      <!-- Dark mode's version (main.css): same grayscale -> negative, but
           spread over nearly the full range (#e9e9e7 -> #1c1c1c) instead
           of compressed into a pale band — bright negatives on the
           near-black page, as in the DARK MODE mockups. -->
      <filter id="duotone-dark">
        <feColorMatrix
          type="matrix"
          values="0.299 0.587 0.114 0 0
                  0.299 0.587 0.114 0 0
                  0.299 0.587 0.114 0 0
                  0     0     0     1 0"
        />
        <feComponentTransfer color-interpolation-filters="sRGB">
          <feFuncR type="table" tableValues="0.91373 0.10980" />
          <feFuncG type="table" tableValues="0.91373 0.10980" />
          <feFuncB type="table" tableValues="0.90588 0.10980" />
        </feComponentTransfer>
      </filter>
    </svg>

    <template v-if="!showSplash">
      <Map />
      <!-- Mobile only (CSS) — a plain opaque backdrop behind the full
           8.5vh top-chrome strip. SiteNav/SiteIndexBar's own backgrounds
           don't quite cover that whole strip themselves (SiteNav's own
           box starts at `tabTop`, ~1.5vh down, not flush at 0) — normally
           invisible, but app-content/TemplateToolPageLayout's own mobile
           INDEX slide (both translateY past their own top edge) can pass
           behind that uncovered sliver mid-slide without this, showing
           through whatever content was last scrolled behind it. -->
      <div class="mobile-chrome-backdrop" aria-hidden="true" />
      <SiteNav />
      <SiteIndexBar />
      <div v-if="introTransition" class="intro-keep-line" aria-hidden="true" />
      <MobileMenuOverlay v-if="mobileMenuOpen" />
    </template>

    <TeamPanel v-if="showKeywordsPanel && isAboutPage" />
    <KeywordsPanel v-else-if="showKeywordsPanel" />

    <!-- Without this, app/pages/** (the CMS-driven routes) never render —
         app.vue's own template always wins. The flex:1 wrapper (below) is
         what makes the footer always stay on screen: overflow lives here,
         not on the page body, so long content scrolls in this region
         (behind the footer, once it scrolls that far) instead of pushing
         the footer off the bottom of the viewport. margin-left makes room
         for KeywordsPanel (fixed, so it doesn't push layout on its own)
         when that's showing, so page content isn't hidden under it.
         padding-top does the same for SiteNav + SiteIndexBar — now fixed
         (not pushing this down on their own anymore either), so this has
         to clear them itself, only while they're actually rendered. -->
    <div
      class="app-content"
      :class="{
        'has-keywords-panel': showKeywordsPanel,
        'has-nav': !showSplash,
        'reading-mode': readingMode,
        'mobile-index-open': mobileIndexOpen,
      }"
    >
      <NuxtPage />
    </div>

    <SiteFooter />
  </div>
</template>

<style>
/* The splash grid's middle line coming back (see the script comment):
   grows from its centre, holds, fades. */
.intro-keep-line {
  position: fixed;
  z-index: 3;
  left: calc(50vw - 0.5px);
  top: 8.5vh;
  bottom: 0;
  width: 1px;
  background: var(--color-ink);
  transform-origin: center;
  animation:
    intro-keep-line-in 0.9s cubic-bezier(0.2, 0.6, 0.3, 1) 0.1s both,
    intro-keep-line-out 0.6s ease 2s both;
  pointer-events: none;
}

@keyframes intro-keep-line-in {
  from {
    transform: scaleY(0);
  }
}

@keyframes intro-keep-line-out {
  to {
    opacity: 0;
  }
}

/* html/body need the full viewport height passed down explicitly —
   otherwise a height:100% here has nothing to resolve against, and the
   flex column collapses to its content height instead of the viewport. */
html,
body {
  height: 100%;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-content {
  /* A stacking context of its own — bounds any descendant's z-index
     (a page can set whatever it wants) so nothing inside can ever paint
     above SiteNav/SiteIndexBar/SiteFooter's fixed chrome (z-index 3/4)
     purely by setting a big z-index on itself; it's compared against
     this context's own (lower) level instead. This is what keeps scrolled
     content actually disappearing behind the nav/index bar rather than
     over it. */
  position: relative;
  z-index: 0;
  flex: 1 1 auto;
  /* Without this, a flex item defaults to min-height:auto — tall enough
     to fit its content regardless of the parent's own size — which is
     what would push the footer down instead of scrolling in place. */
  min-height: 0;
  overflow-y: auto;
  /* Smooth, not an instant jump, when reading mode toggles this margin
     (below) between 50vw and 25vw — matches KeywordsPanel's own width
     transition so the two resize in lockstep. */
  transition: margin-left 0.5s ease;
}

.app-content.has-keywords-panel {
  margin-left: 50vw;
}

.app-content.has-keywords-panel.reading-mode {
  margin-left: 25vw;
}

/* SiteNav (1.5vh top margin + 3.5vh height) + SiteIndexBar (3.5vh) —
   both fixed now, so this is the only thing left accounting for their
   combined height. */
.app-content.has-nav {
  padding-top: 8.5vh;
}

.mobile-chrome-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .mobile-chrome-backdrop {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 2;
    width: 100%;
    height: 8.5vh;
    background: var(--color-surface);
  }
}

/* No side-by-side split below 768px — the keywords/team panel (InfoPanel.
   vue's own mobile media query) takes the full screen instead of a 50vw/
   25vw slice beside this. Both become identical fixed, full-screen boxes
   and slide vertically past each other (this one up and out, the panel
   up and into view from below) when the same mobile-index-open state
   toggles — a visible scroll/slide, not an instant display swap. */
@media (max-width: 768px) {
  .app-content.has-keywords-panel,
  .app-content.has-keywords-panel.reading-mode {
    margin-left: 0;
    padding-top: 0;
    position: fixed;
    top: 8.5vh;
    bottom: var(--footer-height);
    left: 0;
    width: 100%;
    transform: translateY(0);
    transition: transform 0.4s ease;
  }

  .app-content.has-keywords-panel.mobile-index-open {
    transform: translateY(-100%);
    pointer-events: none;
  }
}
</style>
