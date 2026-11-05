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
  const { og, url } = (file ?? {}) as { og?: unknown, url?: unknown }
  if (typeof og === 'string') return og
  return typeof url === 'string' ? url : undefined
}

/**
 * An image's alt text, unless it's only the file's name (the CMS fills it in from
 * that): a screenshot's date, a design tool's "Group 59", a stock photo's code.
 * Then what's around the image says more.
 */
export function cleanAlt(alt: string | null | undefined, fallback = ''): string {
  const text = alt?.replace(/\s*\(\d{6,}\)\s*$/, '').trim()
  if (!text || /^(screenshot|group \d|img[ _-]?\d|dsc[ _-]?\d)/i.test(text) || /\d{7,}|[A-Za-z0-9]{20,}|\d{3,}x\d{3,}/.test(text)) return fallback
  return text
}
