/**
 * One address per page: /GUIDE and /guide/ go to /guide. Runs before language.ts
 * (handlers run by file name), so it sees the whole path. French's home keeps its
 * own form, /fr/.
 */
export default defineEventHandler((event) => {
  const url = event.node.req.url ?? '/'
  const queryAt = url.indexOf('?')
  const path = queryAt === -1 ? url : url.slice(0, queryAt)
  const query = queryAt === -1 ? '' : url.slice(queryAt)
  // Files and the app's own routes, not pages.
  if (/^\/(_|api\/|@)/.test(path) || /\.[a-z0-9]+$/i.test(path)) return

  const lower = path.toLowerCase()
  const target = lower === '/' || lower === '/fr/' ? lower : lower.replace(/\/+$/, '')
  if (target !== path) return sendRedirect(event, `${target}${query}`, 301)
})
