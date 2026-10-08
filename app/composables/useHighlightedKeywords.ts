/**
 * Shared client state: the set of keyword page ids related to whichever
 * article is currently hovered (guide/index.vue's cards), or `null` when
 * nothing is hovered. Read by KeywordsPanel to dim everything else to 30%
 * opacity while a set is active.
 */
export function useHighlightedKeywords() {
  return useState<string[] | null>('highlighted-keyword-ids', () => null)
}
