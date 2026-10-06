import { fallbackSelect, pageSelects } from '~/kql/page-selects'

/**
 * Fetches one Kirby page by KQL query string, using the select map for a
 * known template (app/kql/page-selects.ts). Use this when the page's
 * template is fixed by the route itself (e.g. `tools/[tool].vue` is
 * always a `tool`). For routes where the template isn't known ahead of
 * time, see `useKirbyPageAnyTemplate` below.
 *
 * Throws a 404 if the page doesn't exist, a fatal 500 if the CMS call
 * itself fails (bad NUXT_PUBLIC_CMS_URL, network error, …).
 */
export async function useKirbyPage<T extends Record<string, unknown> = Record<string, unknown>>(
  key: string,
  query: string,
  template: string,
) {
  const { data: page, error } = await useAsyncData(key, () =>
    useKql<T | null>({ query, select: pageSelects[template] ?? fallbackSelect }),
  )

  if (error.value) {
    throw createError({ statusCode: 500, statusMessage: error.value.message, fatal: true })
  }

  if (!page.value) {
    throw createError({ statusCode: 404, statusMessage: 'Page non trouvée' })
  }

  return page
}

/**
 * Fetches a top-level collection (e.g. `site.index.filterBy(...)`) for an
 * index/listing route. A fatal 500 if the CMS call fails; an empty list
 * (not a 404) if the collection is just empty.
 */
export async function useKirbyCollection<T = Record<string, unknown>>(
  key: string,
  query: string,
  select: Record<string, unknown>,
) {
  const { data, error } = await useAsyncData(key, () => useKqlCollection<T>({ query, select }))

  if (error.value) {
    throw createError({ statusCode: 500, statusMessage: error.value.message, fatal: true })
  }

  return data
}

/**
 * Same as `useKirbyPage`, but for the generic page tree (`default` pages
 * nested arbitrarily, `ressources` theme pages at root with open-ended
 * slugs) where the template isn't known until the page is fetched: probes
 * `intendedTemplate` first, then fetches with the matching select.
 */
export async function useKirbyPageAnyTemplate(key: string, query: string) {
  const { data: page, error } = await useAsyncData(key, async () => {
    const probe = await useKql<{ intendedTemplate: string } | null>({
      query,
      select: { intendedTemplate: 'page.intendedTemplate' },
    })

    if (!probe) return null

    const template = probe.intendedTemplate
    const select = pageSelects[template] ?? fallbackSelect
    const data = await useKql<Record<string, unknown>>({ query, select })

    return { template, ...data }
  })

  if (error.value) {
    throw createError({ statusCode: 500, statusMessage: error.value.message, fatal: true })
  }

  if (!page.value) {
    throw createError({ statusCode: 404, statusMessage: 'Page non trouvée' })
  }

  return page
}
