// TeamPanel.vue's CMS data (the about page's "Équipes" field), in one
// place so KeywordsPanel.vue can start loading it early: going to /about
// then swaps panels with the team already there, so the hand-off morph
// (usePanelMorph) starts immediately instead of after a fetch.
export interface TeamMember {
  first_name?: string
  last_name?: string
  position?: string
  short_bio?: string
  // team.yml's "Photo" (fields/image.yml): file UUIDs (`file://…`) of the
  // about page's own images — resolved against `images` below.
  picture?: string[]
}

export interface TeamBlock {
  type: string
  isHidden?: boolean
  content?: { title?: string, members?: TeamMember[] }
}

export interface TeamPanelData {
  teams?: TeamBlock[]
  images?: { uuid: string, url: string }[]
}

// Kept in app state (per language), not useAsyncData: Nuxt drops async
// data once no mounted component uses it, which would make TeamPanel
// refetch on every visit and leave the panel empty for a moment.
export async function useTeamPanelData() {
  const language = useLanguage()
  const byLanguage = useState<Record<string, TeamPanelData>>('team-panel', () => ({}))

  async function load(lang: string) {
    if (byLanguage.value[lang]) return
    const result = await useKql<TeamPanelData>({
      query: "page('about')",
      select: {
        teams: 'page.content.teams.toBlocks.toArray',
        images: { query: 'page.images', select: { uuid: 'file.uuid', url: true } },
      },
    })
    byLanguage.value = { ...byLanguage.value, [lang]: result }
  }

  await load(language.value)
  // ENG/FR switch (SiteFooter.vue) — fetch the other language on demand.
  watch(language, (lang) => { load(lang).catch(() => {}) })
  return { data: computed(() => byLanguage.value[language.value] ?? null) }
}
