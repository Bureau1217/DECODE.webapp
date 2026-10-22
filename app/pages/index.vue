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
</script>

<template>
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
</template>
