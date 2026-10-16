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
  <TemplateToolPageLayout
    :reading-mode="readingMode"
    :scrollable="false"
    :exit="{ accent: 'var(--tool-campaigns-accent)', textColor: 'var(--tool-campaigns-accent-deep)' }"
  >
    <template #panel>
      <CampaignInfoPanel :campaign="selectedCampaign" :tool="page" />
    </template>
    <template #content>
      <DisinfoMap v-model:campaign="selectedCampaign" :campaigns="props.page.campaigns" />
    </template>
  </TemplateToolPageLayout>
</template>
