<script setup lang="ts">
// Keywords (/keywords) is reachable from articles and the home page's
// keyword list, but deliberately not linked here — not a top-level nav item.
// Links themselves live in navLinks.ts now — MobileMenuOverlay.vue's own
// section list reuses the exact same array.
const links = NAV_LINKS

// Below 768px this row becomes a single "MENU" tab + truncated tagline
// ticker (see .site-nav-mobile-row below) that opens MobileMenuOverlay.vue
// instead — both rows always render, CSS picks which one shows, so there's
// no hydration flash switching between them.
const mobileMenuOpen = useMobileMenuOpen()

const route = useRoute()
// Matches sub-routes too (e.g. /guide/some-article highlights
// "Investigation Guide").
function isActive(to: string) {
  return route.path.startsWith(to)
}

// A custom tool page (TemplateCampaignsMap.vue and friends) reskins the
// whole app shell — nav/index-bar/footer — in its own accent instead of
// the site's usual brown, only while it's open.
const { theme, isThemed } = useToolTheme()

// Same folder-tab silhouette as Splash.vue's top tab (diagonal shoulders,
// small rounded transition into the flat top line) — here closed with a
// flat bottom edge, since each is its own standalone tab rather than one
// corner piece feeding into a page-wide baseline rule. Sized and
// positioned to be the *identical physical tab* as Splash.vue's: 1/4
// viewport width, 3.5% viewport height, 1.5% top margin, first one flush
// left at x:0 — with exactly 4 links, the 4 tabs (each 25vw) span the
// full width edge to edge with no gaps, same as Splash's own tab would if
// tiled across the row.
const TAB_WIDTH_RATIO = 0.25
const TAB_HEIGHT_RATIO = 0.035
const TAB_TOP_RATIO = 0.015

// Mobile's single "MENU" tab (site-nav-mobile-row below) isn't 1/4 of the
// row like desktop's 4 tiled tabs — half the row, the ticker text taking
// up the other half, not derived from TAB_WIDTH_RATIO.
const MOBILE_TAB_WIDTH_RATIO = 0.5

const tabWidth = ref(0)
const mobileTabWidth = ref(0)
const tabHeight = ref(0)
const tabTop = ref(0)

// Same trapezoid silhouette (app/utils/tabPath.ts) for both the desktop
// row's 4 tiled tabs and mobile's single MENU tab — only the width differs
// (tabPath/mobileTabPath below), height/corner geometry is shared.
const tabPath = computed(() => buildTabPath(tabWidth.value, tabHeight.value))
// Splash -> home draw-in (useIntroTransition): tab 1 is the splash's own
// tab, already on screen. The whole row — every tab's stroke and label —
// starts in the splash's ink and warms to brown together (one color at a
// time on screen, never ink and brown meeting on a shared edge). Nothing
// is redrawn: the splash's baseline rule, running from tab 1 to the right
// edge, is exactly where tabs 2-4 sit — their bottom edges ARE that line
// from the first frame, and each tab rises up out of it (a clip opening
// upward, staggered left to right), its label growing from a few letters
// to its full length while deciphering. Tab 1 never had a bottom edge on
// the splash (the baseline only starts at its right corner), so its own
// stays hidden until SiteIndexBar, unfolding downward from that line,
// arrives underneath it.
const introTransition = useIntroTransition()
const TAB_RISE_STAGGER_S = 0.15
function tabRiseDelay(index: number) {
  return index * TAB_RISE_STAGGER_S
}
function labelDelay(index: number) {
  return index === 0 ? 0 : Math.round((tabRiseDelay(index) + 0.4) * 1000)
}
const mobileTabPath = computed(() => buildTabPath(mobileTabWidth.value, tabHeight.value))

function measure() {
  tabWidth.value = window.innerWidth * TAB_WIDTH_RATIO
  mobileTabWidth.value = window.innerWidth * MOBILE_TAB_WIDTH_RATIO
  tabHeight.value = window.innerHeight * TAB_HEIGHT_RATIO
  tabTop.value = window.innerHeight * TAB_TOP_RATIO
}

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onUnmounted(() => {
  window.removeEventListener('resize', measure)
})
</script>

<template>
  <nav
    class="site-nav"
    :class="{ 'is-tool-themed': isThemed, 'is-intro': introTransition }"
    :style="{
      top: `${tabTop}px`,
      height: `${tabHeight}px`,
      '--local-accent': theme?.chromeAccent,
      '--local-accent-text': theme?.chromeText,
    }"
  >
    <div
      v-for="(link, index) in links"
      :key="link.to"
      class="nav-tab-wrap nav-tab-wrap--desktop"
      :class="{ active: isActive(link.to) }"
      :style="{ width: `${tabWidth}px`, '--tab-rise-delay': `${tabRiseDelay(index)}s` }"
    >
      <svg
        v-if="tabPath"
        class="nav-tab-shape"
        :viewBox="`0 0 ${tabWidth} ${tabHeight}`"
        :width="tabWidth"
        :height="tabHeight"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path :d="tabPath" stroke-linejoin="round" />
      </svg>
      <NuxtLink :to="link.to" class="nav-tab">
        <DecipherText v-if="introTransition" :text="link.label" :delay="labelDelay(index)" grow />
        <template v-else>{{ link.label }}</template>
      </NuxtLink>
    </div>

    <!-- Below 768px only (CSS) — ticker + single MENU tab in place of the
         4 tiled tabs above, which both always render so there's no
         hydration flash when the breakpoint flips. Scrolling marquee
         (doubled text + translateX loop), not static truncated text —
         same technique as Splash.vue's own .splash-tab-ticker-track. -->
    <div class="site-nav-ticker">
      <div class="site-nav-ticker-track">
        <span>{{ SITE_TAGLINE }}</span>
        <span>{{ SITE_TAGLINE }}</span>
      </div>
    </div>
    <!-- .active while the menu is open: filled brown, flowing straight
         into the menu panel below it (MobileMenuOverlay.vue). -->
    <div class="nav-tab-wrap nav-tab-wrap--mobile" :class="{ active: mobileMenuOpen }" :style="{ width: `${mobileTabWidth}px` }">
      <svg
        v-if="mobileTabPath"
        class="nav-tab-shape"
        :viewBox="`0 0 ${mobileTabWidth} ${tabHeight}`"
        :width="mobileTabWidth"
        :height="tabHeight"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path :d="mobileTabPath" stroke-linejoin="round" />
      </svg>
      <button type="button" class="nav-tab nav-tab-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen">
        {{ mobileMenuOpen ? 'Close' : 'Menu' }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* Identical physical sizing to Splash.vue's own tab (tabWidth/tabHeight/
   tabTop, script, all inline styles here) — with exactly 4 links, 4×25vw
   tabs tile edge to edge and exactly fill the width, no gap/justify
   trickery needed; the first one starts flush at x:0, same as Splash's. */
.site-nav {
  position: fixed;
  left: 0;
  z-index: 3;
  display: flex;
  align-items: stretch;
  width: 100%;
  /* Opaque — without this, the gaps around the tab SVGs' own trapezoid
     shapes (desktop) and the ticker's own plain rectangle (mobile, no
     shape at all) are transparent, letting whatever's sliding underneath
     (app.vue's own .app-content, translateY(-100%) past its own top edge
     when the mobile INDEX toggle opens) show through during/after that
     slide — same reasoning as SiteFooter.vue's own opaque background. */
  background: var(--color-surface);
}

.nav-tab-wrap {
  position: relative;
  display: block;
  height: 100%;
}

/* Ticker: scrolling marquee, not static truncated text — same text
   SiteFooter.vue's own .footer-tagline shows (desktop), constrained to
   the space left of the mobile MENU tab here instead of centered on the
   full viewport. Hidden on desktop (.nav-tab-wrap--mobile's own row only
   shows below 768px, see the media query below) — both rows always
   render so there's no hydration flash when the breakpoint flips. */
.site-nav-ticker {
  display: none;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  padding-left: 12px;
  color: var(--color-brand);
}

.site-nav.is-tool-themed .site-nav-ticker {
  color: var(--local-accent-text);
}

.site-nav-ticker-track {
  display: flex;
  white-space: nowrap;
  width: max-content;
  font-family: var(--font-mono);
  font-size: 10pt;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  /* Scrolls right to left — translateX(0) to (-50%) moves the (doubled)
     content leftward, so new text keeps entering from the right. Exactly
     half the track's width is where the first copy started, so the loop
     has no visible seam (same technique as Splash.vue's own
     .splash-tab-ticker-track/.splash-images-track). */
  animation: site-nav-ticker-scroll 16s linear infinite;
}

.site-nav-ticker-track span {
  padding-right: 3rem;
}

@keyframes site-nav-ticker-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.nav-tab-wrap--mobile {
  display: none;
}

/* Reset the button's own UA chrome (border/background/padding) — .nav-tab
   (shared with the desktop NuxtLink tabs) supplies the actual look.
   width:100% — a <button> shrink-wraps to its label even as display:flex
   (unlike the desktop tabs' <a>), which left MENU/CLOSE hugging the tab's
   left side instead of centered in it. */
.nav-tab-menu-btn {
  appearance: none;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
}

@media (max-width: 768px) {
  .nav-tab-wrap--desktop {
    display: none;
  }

  .site-nav-ticker {
    display: flex;
    align-items: center;
  }

  /* flex-shrink:0 — the ticker's own marquee track (width:max-content,
     the doubled tagline text) gives .site-nav-ticker a very wide content-
     based flex-basis despite its overflow:hidden clipping, which was
     dragging this tab's own explicit width (mobileTabWidth, inline style)
     down well below its intended size under the default flex-shrink:1 —
     confirmed via getBoundingClientRect(): the inline style read 214.5px
     but the rendered box measured only ~108px. */
  .nav-tab-wrap--mobile {
    display: block;
    flex-shrink: 0;
  }
}

.nav-tab-shape {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: visible;
}

/* Default: outlined in the brand brown, not filled — see .active and
   :hover below for the filled state. */
.nav-tab-shape path {
  fill: var(--color-surface);
  stroke: var(--color-brand);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  transition: fill 0.15s ease;
}

.nav-tab {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 28px;
  box-sizing: border-box;
  white-space: nowrap;
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-brand);
  transition: color 0.15s ease;
}

/* Hover or current page — same filled treatment either way. */
/* Draw-in (script, tabRiseDelay): see the comment there. Starting with
   the clip's top at 100% leaves only the outline's bottom edge showing
   (the -4px outsets keep the stroke itself unshaved) — the baseline. */
.site-nav.is-intro .nav-tab-wrap--desktop:not(:first-child) {
  animation: nav-tab-rise 0.9s cubic-bezier(0.3, 0, 0.15, 1) var(--tab-rise-delay) both;
}

.site-nav.is-intro .nav-tab-wrap--desktop:first-child {
  animation: nav-tab-first-no-base 0.6s backwards;
}

@keyframes nav-tab-first-no-base {
  from,
  to {
    clip-path: inset(-4px -4px 1px -4px);
  }
}

@keyframes nav-tab-rise {
  from {
    clip-path: inset(100% -4px -4px -4px);
  }

  to {
    clip-path: inset(-4px -4px -4px -4px);
  }
}

.site-nav.is-intro .nav-tab-shape path {
  animation: nav-tab-warm 1.6s ease-in-out 0.2s both;
}

.site-nav.is-intro .nav-tab {
  animation: nav-tab-label-warm 1.6s ease-in-out 0.2s both;
}

@keyframes nav-tab-label-warm {
  from {
    color: var(--color-ink);
  }
}

@keyframes nav-tab-warm {
  from {
    stroke: var(--color-ink);
  }
}

.nav-tab-wrap:hover .nav-tab-shape path,
.nav-tab-wrap.active .nav-tab-shape path {
  fill: var(--color-chrome);
}

.nav-tab-wrap:hover .nav-tab,
.nav-tab-wrap.active .nav-tab {
  color: var(--color-on-fill);
}

/* Whichever tool's own accent (--local-accent/-deep, set inline from
   useToolTheme()) instead of brown — one generic block instead of one
   per tool now that the color itself is a custom property. */
.site-nav.is-tool-themed .nav-tab-shape path {
  stroke: var(--local-accent-text);
}

.site-nav.is-tool-themed .nav-tab {
  color: var(--local-accent-text);
}

.site-nav.is-tool-themed .nav-tab-wrap:hover .nav-tab-shape path,
.site-nav.is-tool-themed .nav-tab-wrap.active .nav-tab-shape path {
  fill: var(--local-accent);
}

/* .nav-tab's own base rule above has the same specificity as
   .nav-tab-wrap.active .nav-tab { color: var(--color-surface) } (3 class
   selectors each), so source order alone decides the winner and this one
   (declared later) was overriding the active tab's text back to the
   accent color even though its background is filled solid. One more
   class here (4 selectors) is what makes this win instead, restoring
   white text on the filled/active tab while inactive ones stay
   accent-colored. */
.site-nav.is-tool-themed .nav-tab-wrap:hover .nav-tab,
.site-nav.is-tool-themed .nav-tab-wrap.active .nav-tab {
  color: var(--color-on-fill);
}
</style>
