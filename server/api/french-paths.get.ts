// The paths that really exist in French (server/utils/publicPages.ts), for each
// page's canonical and hreflang tags. Cached: every server render reads it.
export default defineCachedEventHandler(async () => {
  const pages = await listPublicPages()
  return pages.filter((page) => page.french).map((page) => page.path)
}, { maxAge: 60 * 10, name: 'french-paths' })
