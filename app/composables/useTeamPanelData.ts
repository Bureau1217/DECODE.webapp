// TeamPanel.vue's CMS data (the about page's "Équipes" field), in one
// place so KeywordsPanel.vue can start loading it early: going to /about
// then swaps panels with the team already there, so the hand-off morph
// (usePanelMorph) starts immediately instead of after a fetch.
export interface TeamMember {
  first_name?: string
  last_name?: string
}

export interface TeamBlock {
  type: string
  isHidden?: boolean
  content?: { title?: string, members?: TeamMember[] }
}

// Kept in app state (per language), not useAsyncData: Nuxt drops async
// data once no mounted component uses it, which would make TeamPanel
// refetch on every visit and leave the panel empty for a moment.
export async function useTeamPanelData() {
  const language = useLanguage()
  const byLanguage = useState<Record<string, { teams?: TeamBlock[] }>>('team-panel', () => ({}))

  async function load(lang: string) {
    if (byLanguage.value[lang]) return
    const result = await useKql<{ teams?: TeamBlock[] }>({
      query: "page('about')",
      select: { teams: 'page.content.teams.toBlocks.toArray' },
    })
    byLanguage.value = { ...byLanguage.value, [lang]: result }
  }

  await load(language.value)
  // ENG/FR switch (SiteFooter.vue) — fetch the other language on demand.
  watch(language, (lang) => { load(lang).catch(() => {}) })
  return { data: computed(() => byLanguage.value[language.value] ?? null) }
}
