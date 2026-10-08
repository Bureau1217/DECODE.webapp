/**
 * Shared toggle (SiteIndexBar.vue's own "Reading mode" button) — shrinks
 * KeywordsPanel to a quarter of the viewport and lets the main content
 * area expand into the freed space, both in app.vue. A few other
 * fixed-position elements (SiteIndexBar's own content-divider) track the
 * same boundary so they stay aligned with it.
 */
export function useReadingMode() {
  return useState<boolean>('reading-mode', () => false)
}
