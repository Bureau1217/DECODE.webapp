/**
 * Server-side proxy for DECODE.cms's KQL endpoint
 * (site/plugins/kql, `POST /api/query`).
 *
 * The browser calls *this* (same-origin as the Nuxt app, so no CORS), and
 * this forwards the request to Kirby server-to-server. Kirby has no CORS
 * or OPTIONS handling for `/api/query`, so a direct browser→Kirby call
 * always fails the preflight (`OPTIONS` → 404) — confirmed live: `curl`
 * and Node's `fetch` reach Kirby fine (no CORS enforcement outside a
 * browser), but Chrome's preflight consistently 404s. Proxying through
 * the app's own origin sidesteps the problem entirely rather than trying
 * to configure CORS on the Kirby side.
 *
 * This is also where kqlUser/kqlPassword (server-only runtimeConfig) get
 * used — they never need to exist in any client-reachable code this way.
 */
export default defineEventHandler(async (event) => {
  const { public: { cmsUrl }, kqlUser, kqlPassword } = useRuntimeConfig(event)

  if (!cmsUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_PUBLIC_CMS_URL is not set — point it at the DECODE.cms instance (see .env.example).',
    })
  }

  const body = await readBody(event)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (kqlUser && kqlPassword) {
    headers.Authorization = `Basic ${Buffer.from(`${kqlUser}:${kqlPassword}`).toString('base64')}`
  }

  return await $fetch('/api/query', {
    baseURL: cmsUrl,
    method: 'POST',
    headers,
    body,
  })
})
