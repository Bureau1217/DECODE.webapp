/**
 * SSR-safe reactive match against the site's mobile breakpoint (768px,
 * same value every `@media (max-width: 768px)` block in this codebase
 * uses) — for the handful of places that need a JS branch (SiteNav's tab-
 * shape math, HoverTooltip's position clamping, SiteIndexBar's INDEX
 * click target), not for layout reflow, which stays plain CSS `@media`
 * everywhere else.
 */
export function useIsMobile() {
  const isMobile = useState<boolean>('is-mobile', () => false)

  if (import.meta.client) {
    onMounted(() => {
      const mql = window.matchMedia('(max-width: 768px)')
      isMobile.value = mql.matches
      const update = (e: MediaQueryListEvent) => (isMobile.value = e.matches)
      mql.addEventListener('change', update)
      onUnmounted(() => mql.removeEventListener('change', update))
    })
  }

  return isMobile
}
