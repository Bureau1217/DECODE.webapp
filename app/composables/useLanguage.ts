/**
 * Content language for every KQL request — English by default, French on
 * demand (SiteFooter's ENG/FR toggle). A cookie, not useState/localStorage:
 * SSR has to know it too, or the server would render English and the
 * client would hydrate French on top of it.
 *
 * DECODE.cms has the matching languages (site/languages/{en,fr}.php);
 * server/api/kql.post.ts forwards this as Kirby's `X-Language` header.
 */
export const LANGUAGES = ['en', 'fr'] as const
export type Language = (typeof LANGUAGES)[number]

export function useLanguage() {
  return useCookie<Language>('decode-lang', {
    default: () => 'en',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
}
