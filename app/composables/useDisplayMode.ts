/**
 * Shared (SiteIndexBar.vue's own Index/Visual pair, KeywordsPanel.vue
 * reacts to it) — Visual expands every row to show that keyword's own
 * images (tag.yml's "Image" field) below its title.
 */
export function useDisplayMode() {
  return useState<'index' | 'visual'>('display-mode', () => 'index')
}
