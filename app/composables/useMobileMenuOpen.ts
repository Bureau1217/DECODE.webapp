/**
 * Mobile-only nav overlay toggle (SiteNav.vue's own MENU tab, below the
 * 768px breakpoint) — read by MobileMenuOverlay.vue, which renders only
 * while this is true.
 */
export function useMobileMenuOpen() {
  return useState<boolean>('mobile-menu-open', () => false)
}
