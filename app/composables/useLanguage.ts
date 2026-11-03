/**
 * Content language for every KQL request: English, or French under /fr/…. The
 * URL decides (server/middleware/language.ts), so each language has addresses
 * of its own that search engines can index. Switching language is a full page
 * load to the other URL (SiteFooter.vue), so this never changes within a visit.
 *
 * DECODE.cms has the matching languages (site/languages/{en,fr}.php);
 * server/api/kql.post.ts forwards this as Kirby's `X-Language` header.
 */
export const LANGUAGES = ['en', 'fr'] as const
export type Language = (typeof LANGUAGES)[number]

export function useLanguage() {
  return useState<Language>('language', () => (useRequestEvent()?.context.language === 'fr' ? 'fr' : 'en'))
}

// The same page in a language. `path` is language-free, like route.path.
export function pathInLanguage(path: string, language: Language) {
  if (language === 'en') return path
  return `/fr${path}`
}
