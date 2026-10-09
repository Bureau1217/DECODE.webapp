<script setup lang="ts">
// Custom detail view for the "Campaigns Maps" tool specifically (wired in
// app/pages/tools/[tool].vue by slug, not used by any other tool) — left
// panel shows the selected campaign's own details (CampaignInfoPanel.vue),
// right panel is the actual map (DisinfoMap.vue, ported from the sibling
// DECODE.map project). Self-contained: doesn't use app.vue's own
// KeywordsPanel slot (individual tool pages aren't in its route list),
// it lays out its own fixed left panel + offset right content here.
import type { CampaignWithReceivers } from '~/types/campaign'

// Same `tool` KQL select ([tool].vue) TemplateTool.vue takes — `title`/
// `description` feed CampaignInfoPanel's intro state, `campaigns` (the
// select's own structural-children relation) feeds the map and is what
// editors manage in the CMS (child pages under tools/campaigns-map,
// template: campaign) instead of a static data file.
const props = defineProps<{
  page: {
    title: string
    description?: string
    campaigns: CampaignWithReceivers[]
  }
}>()

const selectedCampaign = ref<CampaignWithReceivers | null>(null)

// SiteIndexBar's own "Reading mode" toggle — same shared state
// KeywordsPanel.vue/TeamPanel.vue read, wired in here too so it actually
// does something on this page (it didn't before: this template built its
// own layout independently of app.vue's margin-left/showKeywordsPanel
// logic, which is what normally reacts to this).
const readingMode = useReadingMode()
</script>

<template>
  <div class="campaigns-map-page">
    <CampaignInfoPanel :campaign="selectedCampaign" :tool="page" />
    <div class="campaigns-map-content" :class="{ 'reading-mode': readingMode }">
      <DisinfoMap v-model:campaign="selectedCampaign" :campaigns="props.page.campaigns" />
    </div>
  </div>
</template>

<style scoped>
.campaigns-map-page {
  position: relative;
}

/* Fills exactly the space between SiteNav/SiteIndexBar (8.5vh, top) and
   SiteFooter (var(--footer-height), bottom) — same formula used
   throughout (guide/index.vue, DetailPanelChrome.vue). margin-left makes
   room for CampaignInfoPanel (fixed, 50vw normally/25vw in reading mode,
   so it doesn't push layout on its own) — kept in sync with that panel's
   own width (CampaignInfoPanel.vue) by reacting to the same readingMode
   state, with the same transition so they resize together. */
.campaigns-map-content {
  margin-left: 50vw;
  height: calc(100vh - 8.5vh - var(--footer-height));
  transition: margin-left 0.5s ease;
}

.campaigns-map-content.reading-mode {
  margin-left: 25vw;
}
</style>
