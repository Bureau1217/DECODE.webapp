/**
 * Shared client state: is the splash screen currently showing (as opposed
 * to Home)? Written by pages/index.vue, read by app.vue to hide the site
 * nav (and the host test header) while the splash is up.
 */
export function useSplashVisible() {
  // Defaults to true on '/' rather than waiting for pages/index.vue to set
  // it: app.vue reads this (KeywordsPanel, .app-content classes) before
  // the page's own setup runs, so SSR would otherwise render '/' with the
  // Home chrome — and Vue's hydration doesn't patch a mismatched class,
  // leaving the splash squeezed beside a 50vw margin.
  return useState<boolean>('splash-visible', () => useRoute().path === '/')
}
