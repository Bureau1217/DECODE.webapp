import { typeset } from '~/utils/typeset'

// Body text from the CMS typeset for the page's language (utils/typeset.ts):
// no widows or orphans, French's narrow no-break spaces. Never for titles.
export function useTypeset() {
  const language = useLanguage()
  return (html: string | null | undefined) => typeset(html, language.value)
}
