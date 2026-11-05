import type { MaybeRefOrGetter } from 'vue'

/**
 * Per-page title / description / preview image for search engines and link
 * previews. app.vue sets the site-wide defaults (title template, canonical,
 * og:url, fallback description); a page only overrides what it knows.
 *
 * Values are getters so CMS data that changes on client-side navigation (same
 * page component, new slug) keeps the tags in sync.
 */
export interface PageSeo {
  title?: MaybeRefOrGetter<string | null | undefined>
  description?: MaybeRefOrGetter<string | null | undefined>
  image?: MaybeRefOrGetter<string | null | undefined>
  // Pages that shouldn't show up in results themselves (e.g. /search).
  noindex?: boolean
  // og:type. The site-wide default (app.vue) is 'website'.
  ogType?: 'article' | 'website'
}

export function usePageSeo(seo: PageSeo) {
  const title = () => toMetaTitle(toValue(seo.title))
  const description = () => toMetaDescription(toValue(seo.description))
  const image = () => toValue(seo.image) || undefined

  useSeoMeta({
    title,
    ogTitle: () => (title() ? `${title()} · DE.CO.DE` : undefined),
    description,
    ogDescription: description,
    ogImage: image,
    ...(seo.ogType ? { ogType: seo.ogType } : {}),
    robots: seo.noindex ? 'noindex, follow' : undefined,
  })
}

/** Search results show about this many characters of a title. */
const META_TITLE_MAX = 60
export const META_TITLE_BRAND = ' · DE.CO.DE'

/**
 * A title short enough to show whole in search results: its part before a subtitle
 * if it has one, else cut at a word. app.vue adds the site's name only if there's
 * room for that too.
 */
export function toMetaTitle(text: string | null | undefined): string | undefined {
  const title = text?.trim()
  if (!title) return undefined
  if (title.length <= META_TITLE_MAX) return title
  const subtitle = title.match(/^(.{20,60}?[?!]|.{20,60}?)(?:\s+[–—|]\s+|\s?:\s)/)
  if (subtitle) return subtitle[1]!.trim()
  const cut = title.slice(0, META_TITLE_MAX - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.–-]+$/, '')}…`
}

/**
 * CMS text → a meta description: tags and Markdown/KirbyText markup stripped,
 * whitespace collapsed, cut at a word boundary to ~160 characters (what
 * Google shows before truncating). Empty → undefined, so the site-wide
 * default from app.vue stays in place.
 */
export function toMetaDescription(text: string | null | undefined, max = 160): string | undefined {
  if (!text) return undefined

  const plain = text
    .replace(/<[^>]+>/g, ' ')
    // [text](url) → text; KirbyTags like (link: … text: label) → label, else dropped
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\(\w+:[^)]*?text:\s*([^)]*)\)/g, '$1')
    .replace(/\(\w+:[^)]*\)/g, ' ')
    .replace(/[*_#>`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plain) return undefined
  if (plain.length <= max) return plain

  const cut = plain.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–-]+$/, '')}…`
}
