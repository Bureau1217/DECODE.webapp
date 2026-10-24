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
}

export function usePageSeo(seo: PageSeo) {
  const title = () => toValue(seo.title)?.trim() || undefined
  const description = () => toMetaDescription(toValue(seo.description))
  const image = () => toValue(seo.image) || undefined

  useSeoMeta({
    title,
    ogTitle: () => (title() ? `${title()} · DE.CO.DE` : undefined),
    description,
    ogDescription: description,
    ogImage: image,
    robots: seo.noindex ? 'noindex, follow' : undefined,
  })
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
