/**
 * Shared client state: is the splash screen currently showing (as opposed
 * to Home)? Written by pages/index.vue, read by app.vue to hide the site
 * nav (and the host test header) while the splash is up.
 */
export function useSplashVisible() {
  return useState<boolean>('splash-visible', () => false)
}
