// A CMS image, from this site's own origin: the CMS (another origin) sends no
// CORS headers, so the browser can't read an image's pixels from it. The splash
// measures each of its images' tones this way (Splash.vue, toneImages), to fit
// the duotone to each. Only the CMS's own media, nothing else.
export default defineEventHandler(async (event) => {
  const { cmsUrl } = useRuntimeConfig().public
  const src = String(getQuery(event).src ?? '')
  const base = new URL(cmsUrl)
  let url: URL
  try {
    url = new URL(src)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Bad src' })
  }
  if (url.origin !== base.origin || !url.pathname.startsWith('/media/')) {
    throw createError({ statusCode: 403, statusMessage: 'Not CMS media' })
  }
  const response = await fetch(url)
  if (!response.ok) throw createError({ statusCode: response.status })
  setHeader(event, 'Content-Type', response.headers.get('content-type') ?? 'application/octet-stream')
  setHeader(event, 'Cache-Control', 'public, max-age=86400')
  return Buffer.from(await response.arrayBuffer())
})
