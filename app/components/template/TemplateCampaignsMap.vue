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
    credits?: string
    campaigns: CampaignWithReceivers[]
  }
}>()

// Placeholder until the project team confirms the actual names — the
// CMS has no credits for this tool yet.
const credits = computed(() => props.page.credits || 'Léa Dubois, Hugo Martin & Chloé Rousseau')

// A campaign's own URL (/tools/campaigns-map/<slug>) opens straight on it, past
// the entrance screen, with its details in the server-rendered panel. From
// there on the selection and the URL follow each other.
const route = useRoute()
const router = useRouter()
const campaignFromRoute = () => props.page.campaigns.find((c) => c.slug === route.params.campaign) ?? null
const selectedCampaign = ref<CampaignWithReceivers | null>(campaignFromRoute())
const openedOnCampaign = !!selectedCampaign.value
watch(selectedCampaign, (campaign) => {
  const path = campaign ? `/tools/${route.params.tool}/${campaign.slug}` : `/tools/${route.params.tool}`
  if (path !== route.path) router.replace(path)
})
watch(() => route.params.campaign, () => {
  if (route.path.startsWith(`/tools/${route.params.tool}`)) selectedCampaign.value = campaignFromRoute()
})

// Start opens on a campaign, a different one picked at random each visit.
function selectRandomCampaign() {
  const { campaigns } = props.page
  selectedCampaign.value = campaigns[Math.floor(Math.random() * campaigns.length)] ?? null
}

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
    :intro="openedOnCampaign ? null : {
      title: props.page.title,
      description: props.page.description,
      credits,
      band: 'var(--tool-campaigns-accent)',
      bandText: 'var(--color-on-fill)',
      start: 'var(--tool-campaigns-chrome)',
      cover: 'var(--tool-campaigns-cover)',
      build: 'fade',
    }"
    @start="selectRandomCampaign"
  >
    <template #panel="{ empty }">
      <CampaignInfoPanel :campaign="selectedCampaign" :tool="{ ...page, credits }" :empty="empty" />
      <!-- The map's markers aren't links, so this is how crawlers (and screen
           readers) reach each campaign. -->
      <nav class="visually-hidden" :aria-label="props.page.title">
        <h1 v-if="selectedCampaign">{{ selectedCampaign.title }}</h1>
        <ul>
          <li v-for="campaign in props.page.campaigns" :key="campaign.slug">
            <NuxtLink :to="`/tools/${route.params.tool}/${campaign.slug}`">{{ campaign.title }}</NuxtLink>
          </li>
        </ul>
      </nav>
    </template>
    <template #content>
      <DisinfoMap v-model:campaign="selectedCampaign" :campaigns="props.page.campaigns" />
    </template>
  </TemplateToolPageLayout>
</template>
