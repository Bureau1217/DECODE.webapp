<script setup lang="ts">
// Same fixed half-viewport shell as KeywordsPanel.vue (InfoPanel.vue),
// but only ever shown on /about (app.vue) in place of it: sourced from
// the about page's own "Équipes" field
// (DECODE.cms/site/blueprints/blocks/team.yml) instead of the global
// keyword taxonomy — team name instead of a keyword category, members
// instead of keywords.
const { data } = await useTeamPanelData()
const language = useLanguage()

const teams = computed(() => {
  return (data.value?.teams ?? [])
    .filter((b) => b.type === 'team' && !b.isHidden && b.content?.title)
    .map((b) => ({
      title: b.content!.title!,
      members: (b.content!.members ?? [])
        .map((m) => ({
          name: [m.first_name, m.last_name].filter(Boolean).join(' '),
          bio: m.short_bio || '',
        }))
        .filter((m) => m.name),
    }))
})

// Same popup as KeywordsPanel.vue's definitions: a hovered member's short
// bio over the row's own unused white space, when they have one;
// tap to open/close on mobile, where there's no hover.
const hoveredMember = ref<string | null>(null)
const isMobile = useIsMobile()
// Low in the panel, a bio opens upwards: it would run under the footer.
const popupAbove = ref(false)
function onRowEnter(key: string, row: HTMLElement) {
  if (isMobile.value) return
  popupAbove.value = row.getBoundingClientRect().top > window.innerHeight * 0.6
  hoveredMember.value = key
}
function onRowLeave() {
  if (!isMobile.value) hoveredMember.value = null
}
function onRowTap(key: string) {
  if (isMobile.value) hoveredMember.value = hoveredMember.value === key ? null : key
}

// Same reading-mode width toggle as KeywordsPanel.vue, kept consistent
// sitewide. This panel has no visual mode (SiteIndexBar grays it out).
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
          @mouseenter="onRowEnter(`${ti}-${mi}`, $event.currentTarget as HTMLElement)"
          @mouseleave="onRowLeave"
          @click="onRowTap(`${ti}-${mi}`)"
        >
          <span class="team-panel-member"><DecipherText :text="member.name" :from="panelMorph.fromAt(textOrder[ti]![mi + 1]!)" /></span>
          <div v-if="member.bio && hoveredMember === `${ti}-${mi}`" :class="['team-panel-popup', 'text-note', { 'is-above': popupAbove }]">
            <div class="team-panel-popup-title">{{ member.name }}</div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="team-panel-popup-bio" v-html="member.bio" />
          </div>
        </li>
      </ul>
    </template>
    <!-- Under the last team (Design & development): one block, centred in
         whatever room is left down to the footer. The centre's logo, grayed out
         until hovered, with the two reference pages beside it. -->
    <div class="team-panel-foot">
      <div class="team-panel-partner">
        <!-- Arrives after the teams: the label deciphers once their names
             have mostly settled, then the logo rises in under it. -->
        <p class="team-panel-partner-label text-small"><DecipherText text="A project by" :delay="700" /></p>
        <a class="team-panel-logo" href="https://www.graduateinstitute.ch/international-programmes/decode-decryptons-co-creons-debattons" target="_blank" rel="noopener">
          <img src="/logos/ahcd.png" alt="Albert Hirschman Centre on Democracy" class="no-duotone">
        </a>
        <nav class="team-panel-links text-small" :aria-label="language === 'fr' ? 'Informations' : 'Information'">
          <NuxtLink to="/about/credits">{{ language === 'fr' ? 'Crédits' : 'Credits' }}</NuxtLink>
          <NuxtLink to="/about/legal">{{ language === 'fr' ? 'Mentions légales' : 'Legal terms' }}</NuxtLink>
        </nav>
      </div>
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
   width, centered, its top edge on the row's own divider). */
.team-panel-popup {
  position: absolute;
  top: -1px;
  left: 25%;
  width: 50%;
  z-index: 3;
  box-sizing: border-box;
  padding: 8px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-brand);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  color: var(--color-brand);
}

.team-panel-popup.is-above {
  top: auto;
  bottom: -1px;
}

.team-panel-popup-title {
  font-weight: 700;
}

.team-panel-popup-bio {
  margin-top: 6px;
}

.team-panel-popup-bio :deep(p) {
  margin: 0;
}

.team-panel-popup-bio :deep(a) {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.2em;
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

/* Takes the room left under the teams, and measures it for the block inside. */
.team-panel-foot {
  --logo-width: min(180px, 30vw);
  /* The label and its gap over the logo, whose proportions are those of ahcd.png. */
  --block-height: calc(29px + var(--logo-width) * 0.483);
  flex: 1 0 auto;
  min-height: calc(var(--block-height) + 64px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* One block, centred both ways: the logo, then the links after a gap. */
.team-panel-partner {
  display: grid;
  grid-template-columns: var(--logo-width) auto;
  align-items: center;
  column-gap: 72px;
  row-gap: 12px;
}

.team-panel-partner-label {
  grid-column: 1;
  text-align: center;
}

/* Centred on the logo, and on each other. They rise in with the logo. */
.team-panel-links {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: team-panel-partner-in 0.7s cubic-bezier(0.2, 0.6, 0.3, 1) 1.1s backwards;
  gap: 6px;
}

.team-panel-links a {
  color: var(--color-brand-about);
  text-decoration: none;
}

.team-panel-links a:hover,
.team-panel-links a:focus-visible,
.team-panel-links a.router-link-active {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

/* At rest the label and logo share the panels' hover brown; hovering
   the logo shows it as it is, the label in black with it. */
.team-panel-partner-label {
  margin: 0;
  color: var(--color-brand-resources);
  transition: color 0.2s ease;
}

.team-panel-logo {
  grid-column: 1;
  grid-row: 2;
  display: block;
  width: 100%;
}

.team-panel-partner img {
  display: block;
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

.team-panel-logo:hover img,
.team-panel-logo:focus-visible img {
  filter: none;
}

.team-panel-partner:has(.team-panel-logo:hover, .team-panel-logo:focus-visible) .team-panel-partner-label {
  color: #000;
}

/* Dark page: the logo shows inverted (light) when hovered, the label
   in the page's own ink. */
:root[data-theme='dark'] .team-panel-logo:hover img,
:root[data-theme='dark'] .team-panel-logo:focus-visible img {
  filter: invert(1);
}

:root[data-theme='dark'] .team-panel-partner:has(.team-panel-logo:hover, .team-panel-logo:focus-visible) .team-panel-partner-label {
  color: var(--color-ink);
}

@media (prefers-reduced-motion: reduce) {
  .team-panel-partner img,
  .team-panel-links {
    animation: none;
  }
}

/* Mobile (script, onRowTap): opens inline under the name instead of
   floating over the rows below. */
@media (max-width: 1150px) {
  .team-panel li {
    flex-direction: column;
    align-items: stretch;
    cursor: pointer;
  }

  .team-panel-popup,
  .team-panel-popup.is-above {
    position: static;
    width: auto;
    margin: 0 10px 10px;
    box-shadow: none;
  }
}
</style>
