/**
 * /sitemap.xml — every public URL of the site (server/utils/publicPages.ts), so
 * new articles / resources / tools / keywords appear without a redeploy. A page
 * that really exists in French is listed in both languages, each pointing to
 * the other. A /fr/ URL with no translation is left out: it would only show
 * English text a second time.
 */
export default defineEventHandler(async (event) => {
  const { public: { siteUrl } } = useRuntimeConfig(event)
  const pages = await listPublicPages()

  const escapeXml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  const absolute = (path: string) => escapeXml(new URL(path, siteUrl).href)
  const frenchPath = (path: string) => `/fr${path}`

  const urls = pages.flatMap(({ path, modified, french }) => {
    const alternates = french
      ? [
          `    <xhtml:link rel="alternate" hreflang="en" href="${absolute(path)}"/>`,
          `    <xhtml:link rel="alternate" hreflang="fr" href="${absolute(frenchPath(path))}"/>`,
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(path)}"/>`,
        ]
      : []
    return (french ? [path, frenchPath(path)] : [path]).map((loc) => [
      '  <url>',
      `    <loc>${absolute(loc)}</loc>`,
      ...(modified ? [`    <lastmod>${modified}</lastmod>`] : []),
      ...alternates,
      '  </url>',
    ].join('\n'))
  })

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  // Crawlers don't need it fresher than hourly; spares Kirby repeat hits.
  setHeader(event, 'Cache-Control', 'public, max-age=3600')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
})
