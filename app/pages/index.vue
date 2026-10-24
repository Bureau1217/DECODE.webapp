<script setup lang="ts">
// Splash shows on every full page load of '/' (a reload, a typed URL),
// but not again when navigating back to Home within the same visit:
// `splashDismissed` is in-memory app state, so only a reload resets it.
const splashDismissed = useState('splash-dismissed', () => false)

// Shared with app.vue, which hides the site nav while this is true.
const showSplash = useSplashVisible()
showSplash.value = !splashDismissed.value
// No splash this time: nothing to build, footer stays in place.
const splashIntro = useSplashIntro()
if (!showSplash.value) splashIntro.value = 'done'

onUnmounted(() => {
  // Leaving '/' entirely (e.g. typing another URL) shouldn't leave the nav
  // hidden elsewhere. Also what drops the splash on its way to /guide
  // (dismissSplash): this only runs once that page is ready to swap in.
  showSplash.value = false
})

// The splash hands over straight to the Investigation Guide, not to this
// page's own HomeHero. Its page chunk loads while the splash is up.
onMounted(() => {
  if (showSplash.value) preloadRouteComponents('/guide')
})

// Set before the splash goes, so SiteNav/SiteIndexBar/KeywordsPanel and
// the guide grid already see it when they mount, and play their draw-in
// once.
const introTransition = useIntroTransition()
const INTRO_MS = 2800
const nuxtApp = useNuxtApp()

function dismissSplash() {
  splashDismissed.value = true
  introTransition.value = true
  // The splash holds its outro's last frame until /guide has its data, so
  // the chrome and the guide grid draw in together in one frame, with
  // no HomeHero flashing in between.
  const off = nuxtApp.hook('page:finish', () => {
    off()
    setTimeout(() => { introTransition.value = false }, INTRO_MS)
  })
  navigateTo('/guide')
}

// The splash and HomeHero are client-only (layout measured from the
// viewport), so without this the server-rendered '/' had ~no text and no
// link at all — the nav is hidden while the splash is up (app.vue). This
// block is in the HTML from the first byte: the page's one <h1>, what the
// site is, and plain links into the four sections. Visually hidden (the
// splash and HomeHero already show the same things), not display:none, so
// screen readers get it too — the splash itself has no readable structure.
const language = useLanguage()
const homeDescription = computed(() => SITE_DESCRIPTION[language.value] ?? SITE_DESCRIPTION.en)
</script>

<template>
  <!-- One root node (Nuxt pages need it), with no box of its own so the
       splash / HomeHero lay out exactly as before. -->
  <div class="home-page">
    <div class="home-summary">
      <h1>DE.CO.DE</h1>
      <p>{{ homeDescription }}</p>
      <nav aria-label="Sections">
        <ul>
          <li v-for="link in NAV_LINKS" :key="link.to">
            <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </nav>
    </div>

    <ClientOnly>
      <Splash v-if="showSplash" @continue="dismissSplash" />
      <!-- The keywords panel is rendered globally (app.vue, KeywordsPanel);
           the right half is the splash's grid, countries and a headline at
           rest (HomeHero). -->
      <HomeHero v-else />

      <template #fallback>
        <div class="loading" />
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.home-page {
  display: contents;
}

/* Same visually-hidden recipe as .decipher-sr (main.css). */
.home-summary {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
