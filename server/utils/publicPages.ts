/**
 * Every public URL of the site, built live from DECODE.cms, and which of them
 * really exist in French. Read by /sitemap.xml and by each page's <head>
 * (/api/french-paths).
 *
 * Mirrors how app/pages/** map Kirby ids to routes:
 *  - `default` pages (anywhere in the tree)  → /guide/<id>
 *  - `ressource` items                       → /resources/<id>
 *  - children of `tools`                     → /tools/<slug>
 *  - campaigns of the Campaigns Maps tool    → /tools/campaigns-map/<slug>
 *  - `tags` categories at root + their tags  → /keywords/<id>
 * plus the fixed section pages.
 */
interface KirbyEntry {
  id: string
  slug?: string
  modified?: string | null
  children?: KirbyEntry[]
}

export interface PublicPage {
  path: string
  modified?: string | null
  french: boolean
}

const STATIC_PATHS = ['/', '/guide', '/tools', '/resources', '/keywords', '/about']
// The home page's text lives on this CMS page.
const PAGE_ID_BY_STATIC_PATH: Record<string, string> = { '/': 'infos', '/about': 'about' }

// Kirby's own last-modified date, when it has one (null for pages never
// saved through the panel).
const MODIFIED = "page.modified('Y-m-d')"

async function kql(query: string, select: Record<string, unknown>): Promise<KirbyEntry[]> {
  try {
    const res = await $fetch<{ result: KirbyEntry[] | null }>('/api/kql', {
      method: 'POST',
      headers: { 'x-language': 'en' },
      body: { query, select },
    })
    return res.result ?? []
  } catch (error) {
    // One failing query shouldn't take the rest down: what's left is still
    // worth serving, and a page simply counts as English-only.
    console.error(`[public pages] KQL query failed: ${query}`, error)
    return []
  }
}

export async function listPublicPages(): Promise<PublicPage[]> {
  const [articles, resources, tools, campaigns, keywordGroups, translated] = await Promise.all([
    kql("site.index.filterBy('intendedTemplate', 'default')", { id: true, modified: MODIFIED }),
    kql("site.index.filterBy('intendedTemplate', 'ressource')", { id: true, modified: MODIFIED }),
    kql("page('tools').children", { slug: true, id: true, modified: MODIFIED }),
    kql("page('tools/campaigns-map').children.filterBy('intendedTemplate', 'campaign')", { slug: true, id: true, modified: MODIFIED }),
    kql("site.children.filterBy('intendedTemplate', 'tags')", {
      id: true,
      modified: MODIFIED,
      children: { query: 'page.children', select: { id: true, modified: MODIFIED } },
    }),
    // Needs the method allowed in DECODE.cms's `kql` config. Until then this
    // fails soft: nothing counts as French.
    kql('site.index', { id: true, french: "page.translation('fr').exists" }),
  ])

  const frenchIds = new Set((translated as (KirbyEntry & { french?: boolean })[]).filter((p) => p.french).map((p) => p.id))
  const page = (path: string, entry: KirbyEntry): PublicPage => ({ path, modified: entry.modified, french: frenchIds.has(entry.id) })

  return [
    ...STATIC_PATHS.map((path) => ({ path, french: frenchIds.has(PAGE_ID_BY_STATIC_PATH[path] ?? '') })),
    ...articles.map((p) => page(`/guide/${p.id}`, p)),
    ...resources.map((p) => page(`/resources/${p.id}`, p)),
    ...tools.map((p) => page(`/tools/${p.slug}`, p)),
    ...campaigns.map((p) => page(`/tools/campaigns-map/${p.slug}`, p)),
    ...keywordGroups.flatMap((group) => [
      page(`/keywords/${group.id}`, group),
      ...(group.children ?? []).map((tag) => page(`/keywords/${tag.id}`, tag)),
    ]),
  ]
}
