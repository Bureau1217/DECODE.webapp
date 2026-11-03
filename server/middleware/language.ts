/**
 * The URL decides the language: /fr/… is French, everything else English.
 * The prefix is taken off here, so the app and its pages only ever see
 * language-free paths (app/router.options.ts puts it back on the links).
 *
 * The cookie only remembers a visitor's choice for the bare home page. Crawlers
 * keep no cookies, so they always get what the URL says.
 */
const FRENCH_PATH = /^\/fr(?=\/|\?|$)/

export default defineEventHandler((event) => {
  const url = event.node.req.url ?? '/'

  if (FRENCH_PATH.test(url)) {
    // One address for the French home: the router's own form, /fr/.
    if (url === '/fr' || url.startsWith('/fr?')) return sendRedirect(event, `/fr/${url.slice(3)}`, 301)
    event.context.language = 'fr'
    const stripped = url.replace(FRENCH_PATH, '')
    const path = stripped.startsWith('/') ? stripped : `/${stripped}`
    // Pinned, not just assigned: h3 re-assigns _path from the original URL
    // before each handler, which would give the renderer /fr/… back.
    Object.defineProperty(event, '_path', { get: () => path, set: () => {}, configurable: true })
    return
  }

  event.context.language = 'en'

  if (url === '/' || url.startsWith('/?')) {
    setHeader(event, 'Vary', 'Cookie')
    if (getCookie(event, 'decode-lang') === 'fr') return sendRedirect(event, `/fr${url}`, 302)
  }
})
