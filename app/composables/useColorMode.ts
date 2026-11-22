/**
 * Light/dark theme — SiteFooter's DARK MODE toggle. A cookie (same reason
 * as useLanguage.ts): SSR renders <html data-theme> itself (app.vue), so
 * a dark-mode visitor never gets a flash of the light theme first.
 * Every color it switches lives in app/assets/css/main.css's
 * `:root[data-theme='dark']` block.
 */
export type ColorMode = 'light' | 'dark'

export function useColorMode() {
  return useCookie<ColorMode>('decode-theme', {
    default: () => 'light',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
}

/**
 * Switches the theme with a fade (22 Nov 2026): the browser's cross-fade of
 * the whole page (a view transition), so everything goes together, the
 * images' duotone filters and the canvases included, which a CSS colour
 * transition can't ease. html.vt-theme while it runs (main.css sets its
 * length; Splash.vue's drifting band holds still meanwhile, or the frozen
 * old picture would ghost behind the moving new one). Instant where there
 * are no view transitions, or with reduced motion.
 */
let themeFading = false
export function useToggleColorMode() {
  const colorMode = useColorMode()
  return () => {
    const next: ColorMode = colorMode.value === 'dark' ? 'light' : 'dark'
    const doc = typeof document === 'undefined' ? null : document as Document & { startViewTransition?: (update: () => Promise<void> | void) => { finished: Promise<void> } }
    if (!doc?.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      colorMode.value = next
      return
    }
    if (themeFading) return
    themeFading = true
    const root = document.documentElement
    root.classList.add('vt-theme')
    const transition = doc.startViewTransition(async () => {
      colorMode.value = next
      // The cookie's ref updates now; <html data-theme> with Vue's next render.
      root.setAttribute('data-theme', next)
      await nextTick()
    })
    transition.finished.finally(() => {
      root.classList.remove('vt-theme')
      themeFading = false
    })
  }
}
