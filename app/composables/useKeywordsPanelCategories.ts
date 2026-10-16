// The keywords panel's CMS data (KeywordsPanel.vue), in one place so
// Splash.vue can start loading it early: the panel then mounts with its
// data already there when the splash hands over to the home screen,
// instead of popping in late and missing its draw-in.
export interface CategoryWithTags {
  title: string
  slug: string
  id: string
  tags: {
    title: string
    slug: string
    id: string
    description?: string
    image?: { url: string, alt?: string }[]
  }[]
}

// Kept in app state (per language), not useAsyncData: Nuxt drops async
// data once no mounted component uses it (e.g. while /about shows the
// team panel instead), which would leave the panel empty for a moment
// on its way back — breaking the hand-off morph (usePanelMorph).
export function useKeywordsPanelCache() {
  return useState<Record<string, CategoryWithTags[]>>('keywords-panel-cache', () => ({}))
}

export async function useKeywordsPanelCategories() {
  const language = useLanguage()
  const byLanguage = useKeywordsPanelCache()

  async function load(lang: string) {
    if (byLanguage.value[lang]) return
    const result = await useKqlCollection<CategoryWithTags>({
      query: "site.children.filterBy('intendedTemplate', 'tags')",
      select: {
        title: true,
        slug: true,
        id: true,
        tags: {
          query: 'page.children',
          select: {
            title: true,
            slug: true,
            id: true,
            description: true,
            // tag.yml's own "Image" field (multiple) — shown below the title
            // in visual mode (SiteIndexBar's Index/Visual toggle) only.
            image: {
              query: 'page.content.image.toFiles',
              select: { url: true, alt: true },
            },
          },
        },
      },
    })
    byLanguage.value = { ...byLanguage.value, [lang]: result }
  }

  await load(language.value)
  // ENG/FR switch (SiteFooter.vue) — fetch the other language on demand.
  watch(language, (lang) => { load(lang).catch(() => {}) })
  return computed(() => byLanguage.value[language.value] ?? null)
}
