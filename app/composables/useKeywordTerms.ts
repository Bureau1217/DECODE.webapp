import { termMatchers, markTerms } from '~/utils/keywordTerms'

// The concept, platform or theme whose mention in a text is under the pointer:
// KeywordsPanel.vue treats it as if its own row were hovered.
export const useHoveredTerm = () => useState<string | null>('hovered-term', () => null)

// Marks the keywords mentioned in a page's text (markTerms), each only the first
// time across the page, and returns the listeners for whatever holds that text.
// The page has to await useKeywordsPanelCategories() first, so the server renders
// the marks too.
export function useKeywordTerms() {
  const language = useLanguage()
  const cache = useKeywordsPanelCache()
  const hovered = useHoveredTerm()
  const matchers = computed(() => termMatchers((cache.value[language.value] ?? []).filter((category) => category.slug !== 'question').flatMap((category) => category.tags)))

  function mark(texts: (string | null | undefined)[]) {
    const seen = new Set<string>()
    return texts.map((text) => markTerms(text ?? '', matchers.value, seen, (id) => pathInLanguage(`/keywords/${id}`, language.value)))
  }

  const termOf = (event: Event) => (event.target as Element).closest<HTMLAnchorElement>('a.keyword-term')
  const events = {
    mouseover(event: MouseEvent) {
      const term = termOf(event)
      if (term && canHover()) hovered.value = term.dataset.keyword ?? null
    },
    mouseout(event: MouseEvent) {
      const term = termOf(event)
      // Its words are elements of their own: moving between them isn't leaving.
      if (term && !term.contains(event.relatedTarget as Node | null)) hovered.value = null
    },
    // A plain link in CMS text: without this it would reload the whole site.
    click(event: MouseEvent) {
      const term = termOf(event)
      if (!term || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
      event.preventDefault()
      hovered.value = null
      navigateTo(`/keywords/${term.dataset.keyword}`)
    },
  }
  onBeforeUnmount(() => { hovered.value = null })

  return { mark, events }
}
