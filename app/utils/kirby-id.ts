/**
 * Kirby page ids are slug segments joined by `/` — letters, numbers, `-`
 * and `_` only. Route params land straight inside a KQL query string
 * (`page('…')`), so reject anything outside that charset instead of
 * interpolating it unescaped (KQL has no query-string auth here —
 * `kql.auth` is disabled locally in DECODE.cms).
 */
export function assertSafeKirbyId(id: string): string {
  if (!/^[a-z0-9-_]+(\/[a-z0-9-_]+)*$/i.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Page non trouvée' })
  }

  return id
}
