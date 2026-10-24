/**
 * /sitemap.xml — every public URL of the site, built live from DECODE.cms
 * so new articles / resources / tools / keywords appear without a redeploy.
 *
 * Mirrors how app/pages/** map Kirby ids to routes:
 *  - `default` pages (anywhere in the tree)  → /guide/<id>
 *  - `ressource` items                       → /resources/<id>
 *  - children of `tools`                     → /tools/<slug>
 *  - `tags` categories at root + their tags  → /keywords/<id>
 * plus the fixed section pages. Goes through this app's own /api/kql proxy
 * (same Kirby auth/language handling as the pages), always in English —
 * the language is a cookie, not a URL, so there is only one URL per page.
 */

interface KirbyEntry {
  id: string
  slug?: string
  modified?: string | null
  children?: KirbyEntry[]
}

const STATIC_PATHS = ['/', '/guide', '/tools', '/resources', '/keywords', '/about']

// Kirby's own last-modified date, when it has one (null for pages never
// saved through the panel).
const MODIFIED = "page.modified('Y-m-d')"

export default defineEventHandler(async (event) => {
  const { public: { siteUrl } } = useRuntimeConfig(event)

  const kql = async (query: string, select: Record<string, unknown>): Promise<KirbyEntry[]> => {
    try {
      const res = await $fetch<{ result: KirbyEntry[] | null }>('/api/kql', {
        method: 'POST',
        headers: { 'x-language': 'en' },
        body: { query, select },
      })
      return res.result ?? []
    } catch (error) {
      // One failing query shouldn't take the whole sitemap down — the rest
      // (and the fixed sections) are still worth serving.
      console.error(`[sitemap] KQL query failed: ${query}`, error)
      return []
    }
  }

  const [articles, resources, tools, keywordGroups] = await Promise.all([
    kql("site.index.filterBy('intendedTemplate', 'default')", { id: true, modified: MODIFIED }),
    kql("site.index.filterBy('intendedTemplate', 'ressource')", { id: true, modified: MODIFIED }),
    kql("page('tools').children", { slug: true, id: true, modified: MODIFIED }),
    kql("site.children.filterBy('intendedTemplate', 'tags')", {
      id: true,
      modified: MODIFIED,
      children: { query: 'page.children', select: { id: true, modified: MODIFIED } },
    }),
  ])

  const entries: { path: string, modified?: string | null }[] = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...articles.map((p) => ({ path: `/guide/${p.id}`, modified: p.modified })),
    ...resources.map((p) => ({ path: `/resources/${p.id}`, modified: p.modified })),
    ...tools.map((p) => ({ path: `/tools/${p.slug}`, modified: p.modified })),
    ...keywordGroups.flatMap((group) => [
      { path: `/keywords/${group.id}`, modified: group.modified },
      ...(group.children ?? []).map((tag) => ({ path: `/keywords/${tag.id}`, modified: tag.modified })),
    ]),
  ]

  const escapeXml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const urls = entries.map(({ path, modified }) => [
    '  <url>',
    `    <loc>${escapeXml(new URL(path, siteUrl).href)}</loc>`,
    ...(modified ? [`    <lastmod>${modified}</lastmod>`] : []),
    '  </url>',
  ].join('\n'))

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  // Crawlers don't need it fresher than hourly; spares Kirby repeat hits.
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
})
