import type { KeywordBearing } from '~/types/article'

/**
 * Shared by every card variant with keyword relations (GuideCard,
 * ResourceCard, ...): hovering a card highlights that item's own keywords
 * in KeywordsPanel (shared state, since the panel is a separate,
 * globally-rendered component — app.vue) and dims every other keyword to
 * 30%.
 */
export function useArticleCardHighlight(item: Ref<KeywordBearing>) {
  const highlighted = useHighlightedKeywords()

  function keywordIds() {
    const a = item.value
    return [...(a.themes ?? []), ...(a.concepts ?? []), ...(a.platforms ?? []), ...(a.questions ?? [])].map(
      (k) => k.id,
    )
  }

  return {
    onHover: () => {
      highlighted.value = keywordIds()
    },
    onLeave: () => {
      highlighted.value = null
    },
  }
}
