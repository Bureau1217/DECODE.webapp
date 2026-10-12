// The site's 4 top-level sections — SiteNav.vue's own desktop folder-tab
// row and MobileMenuOverlay.vue's mobile overlay both list exactly these,
// kept here once so the two can't drift apart. No "Home" entry — '/' is
// reached via the logo/splash, not a nav tab, same as before.
export interface NavLink {
  to: string
  label: string
}

export const NAV_LINKS: NavLink[] = [
  { to: '/guide', label: 'Investigation Guide' },
  { to: '/tools', label: 'TOOLS AGAINST DISINFORMATION' },
  { to: '/resources', label: 'resources' },
  { to: '/about', label: 'ABOUT' },
]
