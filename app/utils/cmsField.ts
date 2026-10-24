/**
 * Reads a string / file-url field off a loosely-typed KQL result (the
 * `Record<string, unknown>` useKirbyPage returns) — for usePageSeo getters,
 * which only need a few fields and shouldn't each re-cast the whole page.
 */
export function cmsText(page: unknown, field: string): string | undefined {
  const value = (page as Record<string, unknown> | null | undefined)?.[field]
  return typeof value === 'string' && value.trim() ? value : undefined
}

/** A `fileUrl()` relation (`{ url }`) or a `filesUrls()` list (first `{ url }`). */
export function cmsImage(page: unknown, field: string): string | undefined {
  const value = (page as Record<string, unknown> | null | undefined)?.[field]
  const file = Array.isArray(value) ? value[0] : value
  const url = (file as { url?: unknown } | null | undefined)?.url
  return typeof url === 'string' ? url : undefined
}
