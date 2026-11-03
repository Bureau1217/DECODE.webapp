<script setup lang="ts">
// Splash shows on every full page load of '/' (a reload, a typed URL),
// but not again within the same visit: `splashDismissed` is in-memory app
// state, so only a reload resets it. Once it's gone the Investigation Guide
// is home, so '/' itself just leads there.
const splashDismissed = useState('splash-dismissed', () => false)
// Arriving here from inside the site (the footer logo) isn't a page load.
if (import.meta.client && !useNuxtApp().isHydrating) splashDismissed.value = true

// Shared with app.vue, which hides the site nav while this is true.
const showSplash = useSplashVisible()
showSplash.value = !splashDismissed.value
// No splash this time: nothing to build, footer stays in place.
const splashIntro = useSplashIntro()
if (!showSplash.value) {
  splashIntro.value = 'done'
  navigateTo('/guide', { replace: true })
}

onUnmounted(() => {
  // Leaving '/' entirely (e.g. typing another URL) shouldn't leave the nav
  // hidden elsewhere. Also what drops the splash on its way to /guide
  // (dismissSplash): this only runs once that page is ready to swap in.
  showSplash.value = false
})

// The splash hands over straight to the Investigation Guide. Its page chunk
// loads while the splash is up.
onMounted(() => {
  if (showSplash.value) preloadRouteComponents('/guide')
})

// Set before the splash goes, so SiteNav/SiteIndexBar/KeywordsPanel and
// the guide grid already see it when they mount, and play their draw-in
// once.
const introTransition = useIntroTransition()
const introHoverLock = useIntroHoverLock()
const INTRO_MS = 2800
const HOVER_LOCK_AFTER_MS = 2000
const nuxtApp = useNuxtApp()

function dismissSplash() {
  splashDismissed.value = true
  introTransition.value = true
  introHoverLock.value = true
  // The splash holds its outro's last frame until /guide has its data, so
  // the chrome and the guide grid draw in together in one frame. Replacing
  // the history entry: the browser's back button doesn't return to '/'.
  const off = nuxtApp.hook('page:finish', () => {
    off()
    setTimeout(() => { introTransition.value = false }, INTRO_MS)
    setTimeout(() => { introHoverLock.value = false }, INTRO_MS + HOVER_LOCK_AFTER_MS)
  })
  navigateTo('/guide', { replace: true })
}

// The splash itself is server-rendered, so its text and links (the article
// titles, the guide button) are in the HTML. This adds what it doesn't show: the
// page's one <h1>, and links into the four sections, since the nav is hidden
// while the splash is up (app.vue). Visually hidden, not display:none, so screen
// readers get it too.
const language = useLanguage()
const seoUrl = useSeoUrl()
useJsonLd('organization', () => ({
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${seoUrl('/')}#organization`,
      name: 'DE.CO.DE',
      url: seoUrl('/'),
      logo: new URL('/apple-touch-icon.png', seoUrl('/')).href,
      description: SITE_DESCRIPTION[language.value] ?? SITE_DESCRIPTION.en,
      parentOrganization: { '@type': 'CollegeOrUniversity', name: 'Geneva Graduate Institute', url: 'https://www.graduateinstitute.ch/' },
    },
    {
      '@type': 'WebSite',
      name: 'DE.CO.DE',
      url: seoUrl('/'),
      inLanguage: language.value,
      publisher: { '@id': `${seoUrl('/')}#organization` },
    },
  ],
}))
</script>

<template>
  <!-- One root node (Nuxt pages need it), with no box of its own so the
       splash lays out exactly as before. -->
  <div class="home-page">
    <div class="home-summary">
      <h1>DE.CO.DE</h1>
      <nav aria-label="Sections">
        <ul>
          <li v-for="link in NAV_LINKS" :key="link.to">
            <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </nav>
    </div>

    <Splash v-if="showSplash" @continue="dismissSplash" />
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
