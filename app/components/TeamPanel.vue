<script setup lang="ts">
// Same fixed half-viewport shell as KeywordsPanel.vue (InfoPanel.vue),
// but only ever shown on /about (app.vue) in place of it: sourced from
// the about page's own "Équipes" field
// (DECODE.cms/site/blueprints/blocks/team.yml) instead of the global
// keyword taxonomy — team name instead of a keyword category, members
// instead of keywords.
const { data } = await useTeamPanelData()

const teams = computed(() => {
  const imageUrls = new Map((data.value?.images ?? []).map((img) => [img.uuid, img.url]))
  return (data.value?.teams ?? [])
    .filter((b) => b.type === 'team' && !b.isHidden && b.content?.title)
    .map((b) => ({
      title: b.content!.title!,
      members: (b.content!.members ?? [])
        .map((m) => ({
          name: [m.first_name, m.last_name].filter(Boolean).join(' '),
          position: m.position || '',
          bio: m.short_bio || '',
          picture: m.picture?.[0] ? imageUrls.get(m.picture[0]) : undefined,
        }))
        .filter((m) => m.name),
    }))
})

// Same popup as KeywordsPanel.vue's definitions: a hovered member's
// position, photo and short bio over the row's own unused white space;
// tap to open/close on mobile, where there's no hover.
const hoveredMember = ref<string | null>(null)
const isMobile = useIsMobile()
function onRowEnter(key: string) {
  if (!isMobile.value) hoveredMember.value = key
}
function onRowLeave() {
  if (!isMobile.value) hoveredMember.value = null
}
function onRowTap(key: string) {
  if (isMobile.value) hoveredMember.value = hoveredMember.value === key ? null : key
}

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
  panelMorph.save(teams.value.flatMap((t) => [t.title, ...t.members.map((m) => m.name)]))
})
</script>

<template>
  <InfoPanel class="team-panel" :reading-mode="readingMode">
    <template v-for="(team, ti) in teams" :key="team.title">
      <h3 class="text-label"><DecipherText :text="team.title" :from="panelMorph.fromAt(textOrder[ti]![0]!)" /></h3>
      <ul>
        <li
          v-for="(member, mi) in team.members"
          :key="member.name"
          @mouseenter="onRowEnter(`${ti}-${mi}`)"
          @mouseleave="onRowLeave"
          @click="onRowTap(`${ti}-${mi}`)"
        >
          <span class="team-panel-member"><DecipherText :text="member.name" :from="panelMorph.fromAt(textOrder[ti]![mi + 1]!)" /></span>
          <div v-if="hoveredMember === `${ti}-${mi}`" class="team-panel-popup text-note">
            <img v-if="member.picture" :src="member.picture" :alt="member.name" class="team-panel-popup-picture">
            <div class="team-panel-popup-text">
              <div class="team-panel-popup-title">{{ member.name }}</div>
              <div class="team-panel-popup-position text-small">{{ member.position || team.title }}</div>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-if="member.bio" class="team-panel-popup-bio" v-html="member.bio" />
            </div>
          </div>
        </li>
      </ul>
    </template>
    <!-- Under the last team (Design & development): the centre's logo,
         grayed out until hovered, centred in whatever room is left down
         to the footer. -->
    <div class="team-panel-partner">
      <!-- Arrives after the teams: the label deciphers once their names
           have mostly settled, then the logo rises in under it. -->
      <p class="team-panel-partner-label text-small"><DecipherText text="A project by" :delay="700" /></p>
      <a href="https://www.graduateinstitute.ch/democracy" target="_blank" rel="noopener">
        <img src="/logos/ahcd.png" alt="Albert Hirschman Centre on Democracy" class="no-duotone">
      </a>
    </div>
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
  position: relative;
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
  color: var(--color-ink);
  cursor: default;
}

/* Same box as KeywordsPanel.vue's .keywords-panel-popup (half the row's
   width, centered, its top edge on the row's own divider), with the
   member's photo beside the text when the CMS has one. */
.team-panel-popup {
  position: absolute;
  top: -1px;
  left: 25%;
  width: 50%;
  z-index: 3;
  box-sizing: border-box;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-brand);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  color: var(--color-brand);
}

.team-panel-popup-picture {
  flex-shrink: 0;
  width: 72px;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}

.team-panel-popup-text {
  min-width: 0;
}

.team-panel-popup-title {
  font-weight: 700;
}

.team-panel-popup-position {
  margin-top: 2px;
}

.team-panel-popup-bio {
  margin-top: 6px;
}

.team-panel-popup-bio :deep(p) {
  margin: 0;
}

/* The panel stacks as a column so the logo block can take the space
   left under the last team and centre itself in it. */
.team-panel {
  display: flex;
  flex-direction: column;
}

.team-panel h3,
.team-panel ul {
  flex-shrink: 0;
}

.team-panel-partner {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 10px;
}

/* At rest the label and logo share the panels' hover brown; hovering
   the logo shows it as it is, the label in black with it. */
.team-panel-partner-label {
  margin: 0;
  color: var(--color-brand-resources);
  transition: color 0.2s ease;
}

.team-panel-partner a {
  display: flex;
  justify-content: center;
  width: min(180px, 40%);
}

.team-panel-partner img {
  width: 100%;
  height: auto;
  filter: url(#logo-brown);
  transition: filter 0.2s ease;
  animation: team-panel-partner-in 0.7s cubic-bezier(0.2, 0.6, 0.3, 1) 1.1s backwards;
}

@keyframes team-panel-partner-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

.team-panel-partner a:hover img,
.team-panel-partner a:focus-visible img {
  filter: none;
}

.team-panel-partner:has(a:hover, a:focus-visible) .team-panel-partner-label {
  color: #000;
}

/* Dark page: the logo shows inverted (light) when hovered, the label
   in the page's own ink. */
:root[data-theme='dark'] .team-panel-partner a:hover img,
:root[data-theme='dark'] .team-panel-partner a:focus-visible img {
  filter: invert(1);
}

:root[data-theme='dark'] .team-panel-partner:has(a:hover, a:focus-visible) .team-panel-partner-label {
  color: var(--color-ink);
}

@media (prefers-reduced-motion: reduce) {
  .team-panel-partner img {
    animation: none;
  }
}

/* Mobile (script, onRowTap): opens inline under the name instead of
   floating over the rows below. */
@media (max-width: 768px) {
  .team-panel li {
    flex-direction: column;
    align-items: stretch;
    cursor: pointer;
  }

  .team-panel-popup {
    position: static;
    width: auto;
    margin: 0 10px 10px;
    box-shadow: none;
  }
}
</style>
