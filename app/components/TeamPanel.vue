<script setup lang="ts">
// Same fixed half-viewport panel as KeywordsPanel.vue (shared styling
// duplicated here, not imported — scoped styles don't carry across
// components), but only ever shown on /about (app.vue) in place of it:
// sourced from the about page's own "Équipes" field
// (DECODE.cms/site/blueprints/blocks/team.yml) instead of the global
// keyword taxonomy — team name instead of a keyword category, members
// instead of keywords.
interface TeamMember {
  first_name?: string
  last_name?: string
}

interface TeamBlock {
  type: string
  isHidden?: boolean
  content?: { title?: string, members?: TeamMember[] }
}

const { data } = await useAsyncData('about-teams', () =>
  useKql<{ teams?: TeamBlock[] }>({
    query: "page('about')",
    select: { teams: 'page.content.teams.toBlocks.toArray' },
  }),
)

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
</script>

<template>
  <aside class="team-panel" :class="{ 'reading-mode': readingMode }">
    <template v-for="team in teams" :key="team.title">
      <h3>{{ team.title }}</h3>
      <ul>
        <li v-for="member in team.members" :key="member">
          <span class="team-panel-member">{{ member }}</span>
        </li>
      </ul>
    </template>
  </aside>
</template>

<style scoped>
.team-panel {
  position: fixed;
  z-index: 1;
  left: 0;
  top: 8.5vh;
  bottom: 0;
  width: 50vw;
  overflow-y: auto;
  transition: width 0.5s ease;
}

.team-panel.reading-mode {
  width: 25vw;
}

.team-panel h3 {
  box-sizing: border-box;
  margin: 0;
  height: 30px;
  width: 100%;
  padding-left: 10px;
  background: #b8a084;
  color: #fff;
  font-family: 'Martian Mono', monospace;
  font-weight: 500;
  font-size: 12pt;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
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
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
}

.team-panel li:hover {
  background-color: rgba(184, 160, 132, 0.4);
}

.team-panel-member {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 4px 10px;
  line-height: 1.3;
  font-family: 'Martian Mono', monospace;
  font-size: 11pt;
  color: #3b382f;
}
</style>
