<script setup lang="ts">
// Keywords (/keywords) is reachable from articles and the home page's
// keyword list, but deliberately not linked here — not a top-level nav item.
// No "Home" item — '/' is reached via the logo/splash, not a nav tab.
const links = [
  { to: '/guide', label: 'Investigation Guide' },
  { to: '/tools', label: 'TOOLS AGAINST DISINFORMATION' },
  { to: '/resources', label: 'resources' },
  { to: '/about', label: 'ABOUT' },
]

const route = useRoute()
// Matches sub-routes too (e.g. /guide/some-article highlights
// "Investigation Guide").
function isActive(to: string) {
  return route.path.startsWith(to)
}

// The "Campaigns Maps" tool (TemplateCampaignsMap.vue) reskins the whole
// app shell — nav/index-bar/footer — in its own coral accent (FC7C6A,
// BADGE_COLORS[0]) instead of the site's usual brown, only while it's open.
const isCampaignsMapPage = computed(() => route.path === '/tools/campaigns-map')

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
const TAB_LEFT_DX_RATIO = 22 / 80
const TAB_RIGHT_DX_RATIO = 27 / 80
const TAB_CORNER_R_RATIO = 8 / 80

const tabWidth = ref(0)
const tabHeight = ref(0)
const tabTop = ref(0)

const tabPath = computed(() => {
  const width = tabWidth.value
  const h = tabHeight.value
  if (!width || !h) return ''
  const leftDx = h * TAB_LEFT_DX_RATIO
  const rightDx = h * TAB_RIGHT_DX_RATIO
  const cornerR = h * TAB_CORNER_R_RATIO

  const leftLen = Math.hypot(leftDx, h)
  const leftUx = leftDx / leftLen
  const leftUy = h / leftLen
  const leftBefore = { x: leftDx - cornerR * leftUx, y: cornerR * leftUy }
  const leftAfter = { x: leftDx + cornerR, y: 0 }

  const rightLen = Math.hypot(rightDx, h)
  const rightUx = rightDx / rightLen
  const rightUy = h / rightLen
  const rightApexX = width - rightDx
  const rightBefore = { x: rightApexX - cornerR, y: 0 }
  const rightAfter = { x: rightApexX + cornerR * rightUx, y: cornerR * rightUy }

  return [
    `M 0,${h}`,
    `L ${leftBefore.x.toFixed(2)},${leftBefore.y.toFixed(2)}`,
    `Q ${leftDx.toFixed(2)},0 ${leftAfter.x.toFixed(2)},${leftAfter.y.toFixed(2)}`,
    `L ${rightBefore.x.toFixed(2)},${rightBefore.y.toFixed(2)}`,
    `Q ${rightApexX.toFixed(2)},0 ${rightAfter.x.toFixed(2)},${rightAfter.y.toFixed(2)}`,
    `L ${width},${h}`,
    'Z',
  ].join(' ')
})

function measure() {
  tabWidth.value = window.innerWidth * TAB_WIDTH_RATIO
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
    :class="{ 'is-campaigns-map': isCampaignsMapPage }"
    :style="{ top: `${tabTop}px`, height: `${tabHeight}px` }"
  >
    <div
      v-for="link in links"
      :key="link.to"
      class="nav-tab-wrap"
      :class="{ active: isActive(link.to) }"
      :style="{ width: `${tabWidth}px` }"
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
      <NuxtLink :to="link.to" class="nav-tab">{{ link.label }}</NuxtLink>
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
}

.nav-tab-wrap {
  position: relative;
  display: block;
  height: 100%;
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
  fill: #fff;
  stroke: #a68764;
  stroke-width: 1.5px;
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
  font-family: 'Martian Mono', monospace;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #a68764;
  transition: color 0.15s ease;
}

/* Hover or current page — same filled treatment either way. */
.nav-tab-wrap:hover .nav-tab-shape path,
.nav-tab-wrap.active .nav-tab-shape path {
  fill: #a68764;
}

.nav-tab-wrap:hover .nav-tab,
.nav-tab-wrap.active .nav-tab {
  color: #fff;
}

/* Coral instead of brown — only while the Campaigns Maps tool is open
   (script). */
.site-nav.is-campaigns-map .nav-tab-shape path {
  stroke: #fc7c6a;
}

.site-nav.is-campaigns-map .nav-tab {
  color: #fc7c6a;
}

.site-nav.is-campaigns-map .nav-tab-wrap:hover .nav-tab-shape path,
.site-nav.is-campaigns-map .nav-tab-wrap.active .nav-tab-shape path {
  fill: #fc7c6a;
}

/* .nav-tab's own base coral rule above has the same specificity as
   .nav-tab-wrap.active .nav-tab { color: #fff } (3 class selectors each),
   so source order alone decided the winner and this one (declared later)
   was overriding the active tab's text back to coral even though its
   background is filled solid. One more class here (4 selectors) is what
   makes this win instead, restoring white text on the filled/active tab
   while inactive ones stay coral. */
.site-nav.is-campaigns-map .nav-tab-wrap:hover .nav-tab,
.site-nav.is-campaigns-map .nav-tab-wrap.active .nav-tab {
  color: #fff;
}
</style>
