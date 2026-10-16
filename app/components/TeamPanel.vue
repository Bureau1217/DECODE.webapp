<script setup lang="ts">
// Same fixed half-viewport shell as KeywordsPanel.vue (InfoPanel.vue),
// but only ever shown on /about (app.vue) in place of it: sourced from
// the about page's own "Équipes" field
// (DECODE.cms/site/blueprints/blocks/team.yml) instead of the global
// keyword taxonomy — team name instead of a keyword category, members
// instead of keywords.
const { data } = await useTeamPanelData()

const teams = computed(() =>
  (data.value?.teams ?? [])
    .filter((b) => b.type === 'team' && !b.isHidden && b.content?.title)
    .map((b) => ({
      title: b.content!.title!,
      members: (b.content!.members ?? [])
        .map((m) => [m.first_name, m.last_name].filter(Boolean).join(' '))
        .filter(Boolean),
    })),
)

// Same reading-mode width toggle as KeywordsPanel.vue — kept consistent
// sitewide even though this panel has no visual-mode (member photos)
// equivalent yet.
const readingMode = useReadingMode()

// Panel hand-off with KeywordsPanel (usePanelMorph): texts in reading
// order — each team name, then its members.
const panelMorph = usePanelMorph('team')
const textOrder = computed(() => {
  const order: number[][] = []
  let n = 0
  for (const team of teams.value) order.push([n++, ...team.members.map(() => n++)])
  return order
})
onBeforeUnmount(() => {
  panelMorph.save(teams.value.flatMap((t) => [t.title, ...t.members]))
})
</script>

<template>
  <InfoPanel class="team-panel" :reading-mode="readingMode">
    <template v-for="(team, ti) in teams" :key="team.title">
      <h3><DecipherText :text="team.title" :from="panelMorph.fromAt(textOrder[ti]![0]!)" /></h3>
      <ul>
        <li v-for="(member, mi) in team.members" :key="member">
          <span class="team-panel-member"><DecipherText :text="member" :from="panelMorph.fromAt(textOrder[ti]![mi + 1]!)" /></span>
        </li>
      </ul>
    </template>
  </InfoPanel>
</template>

<style scoped>
/* Shell lives in InfoPanel.vue now — see KeywordsPanel.vue's own note. */

.team-panel h3 {
  box-sizing: border-box;
  margin: 0;
  height: 30px;
  width: 100%;
  padding-left: 10px;
  background: var(--color-brand-resources);
  color: var(--color-on-fill);
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 12pt;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border-strong);
}

.team-panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.team-panel li {
  box-sizing: border-box;
  min-height: 26px;
  width: 100%;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-strong);
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
}

.team-panel li:hover {
  background-color: var(--color-hover-tint);
}

.team-panel-member {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 4px 10px;
  line-height: 1.3;
  font-family: var(--font-mono);
  font-size: 11pt;
  color: var(--color-ink);
}
</style>
