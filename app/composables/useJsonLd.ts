/**
 * Structured data (schema.org JSON-LD) in the page's <head>. `build` is a getter
 * so it follows CMS data on client-side navigation.
 */
export function useJsonLd(key: string, build: () => Record<string, unknown>) {
  useHead({
    script: () => [{
      key: `jsonld-${key}`,
      type: 'application/ld+json',
      innerHTML: JSON.stringify({ '@context': 'https://schema.org', ...build() }),
    }],
  })
}

// The address search engines should use for a language-free path: French only
// where a translation really exists (server/utils/publicPages.ts).
export function useSeoUrl() {
  const { public: { siteUrl } } = useRuntimeConfig()
  const language = useLanguage()
  const frenchPaths = useState<string[]>('french-paths', () => [])
  return (path: string) => new URL(
    pathInLanguage(path, language.value === 'fr' && frenchPaths.value.includes(path) ? 'fr' : 'en'),
    siteUrl,
  ).href
}

// The path up to a page, as a breadcrumb trail. Each item: [name, path].
export function useBreadcrumbJsonLd(items: () => [string, string][]) {
  const seoUrl = useSeoUrl()
  useJsonLd('breadcrumbs', () => ({
    '@type': 'BreadcrumbList',
    itemListElement: items().map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: seoUrl(path),
    })),
  }))
}
