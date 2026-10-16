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
  // hidden elsewhere.
  showSplash.value = false
})

// Set before the splash goes, so SiteNav/SiteIndexBar/KeywordsPanel
// already see it when they mount, and play their draw-in once.
const introTransition = useIntroTransition()
const INTRO_MS = 2800

function dismissSplash() {
  splashDismissed.value = true
  introTransition.value = true
  showSplash.value = false
  setTimeout(() => { introTransition.value = false }, INTRO_MS)
}
</script>

<template>
  <ClientOnly>
    <Splash v-if="showSplash" @continue="dismissSplash" />
    <!-- The keywords panel is rendered globally (app.vue, KeywordsPanel)
         since it's always visible across routes, not just here — nothing
         else lives on the home page once the splash is dismissed. -->
    <main v-else class="visual-placeholder" />

    <template #fallback>
      <div class="loading" />
    </template>
  </ClientOnly>
</template>
