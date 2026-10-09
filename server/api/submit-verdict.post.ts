/**
 * Server-side proxy for DECODE.cms's public submission endpoint
 * (site/plugins/submissions, `POST /submit-verdict`) — same CORS-avoidance
 * reasoning as server/api/kql.post.ts (the browser calls this same-origin
 * route, which forwards server-to-server).
 *
 * Deliberately no Basic Auth header here, unlike kql.post.ts: Kirby's
 * route is intentionally public (a visitor's verdict, not panel content),
 * so there's nothing to authenticate.
 */
export default defineEventHandler(async (event) => {
  const { public: { cmsUrl } } = useRuntimeConfig(event)

  if (!cmsUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PUBLIC_CMS_URL is not set — point it at the DECODE.cms instance (see .env.example).',
    })
  }

  const body = await readBody(event)

  return await $fetch('/submit-verdict', {
    baseURL: cmsUrl,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
})
