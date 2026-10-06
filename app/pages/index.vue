<script setup lang="ts">
// Splash shows once per browser, then '/' always renders Home. The
// seen/not-seen check is client-only (localStorage) — SSR can't know it,
// so this whole toggle renders client-side only (<ClientOnly>) rather than
// risk a server/client mismatch flash.
const INTRO_SEEN_KEY = 'decode-intro-seen'

// Shared with app.vue, which hides the site nav while this is true.
const showSplash = useSplashVisible()
showSplash.value = true

onMounted(() => {
  showSplash.value = localStorage.getItem(INTRO_SEEN_KEY) !== '1'
})

onUnmounted(() => {
  // Leaving '/' entirely (e.g. typing another URL) shouldn't leave the nav
  // hidden elsewhere.
  showSplash.value = false
})

function dismissSplash() {
  localStorage.setItem(INTRO_SEEN_KEY, '1')
  showSplash.value = false
}
</script>

<template>
  <ClientOnly>
    <Splash v-if="showSplash" @continue="dismissSplash" />
    <Home v-else />

    <template #fallback>
      <div class="loading" />
    </template>
  </ClientOnly>
</template>
