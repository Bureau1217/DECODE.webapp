/**
 * Mobile-only view switch (SiteIndexBar.vue's own INDEX button, below the
 * 768px breakpoint) — true shows whichever info panel the current route
 * has (InfoPanel.vue's shell, or TemplateToolPageLayout.vue's own panel
 * slot) full-screen in place of the page's main content; false shows
 * content. On desktop this is never read (Index/Visual there stays
 * useDisplayMode()'s own, unrelated toggle). Reset on every route change
 * (app.vue) so navigating always lands back on content.
 */
export function useMobileIndexOpen() {
  return useState<boolean>('mobile-index-open', () => false)
}
