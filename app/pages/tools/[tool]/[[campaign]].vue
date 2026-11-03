<script setup lang="ts">
const route = useRoute()
const slug = assertSafeKirbyId(String(route.params.tool))
const page = await useKirbyPage(`page:tools/${slug}`, `page('tools/${slug}')`, 'tool')

// Each campaign of the Campaigns Maps tool has its own URL, under the tool's:
// selecting one on the map changes the URL without leaving the page, hence the
// page key ignoring the campaign. Any other tool has nothing under it.
definePageMeta({ key: (route) => String(route.params.tool) })
const campaigns = computed(() => (page.value.campaigns ?? []) as { slug: string, title: string, short_description?: string, page_content?: string }[])
const campaign = computed(() => campaigns.value.find((c) => c.slug === route.params.campaign))
if (route.params.campaign && !campaign.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page non trouvée' })
}

usePageSeo({
  title: () => campaign.value?.title ?? cmsText(page.value, 'title'),
  description: () => campaign.value?.short_description ?? campaign.value?.page_content ?? cmsText(page.value, 'description') ?? cmsText(page.value, 'subtitle'),
  image: () => cmsImage(page.value, 'image'),
})

useBreadcrumbJsonLd(() => [
  ['Tools', '/tools'],
  [cmsText(page.value, 'title') ?? slug, `/tools/${slug}`],
  ...(campaign.value ? [[campaign.value.title, route.path] as [string, string]] : []),
])

// Each of the three tools gets its own custom view instead of the
// generic TemplateTool — all have underlying CMS data (campaigns /
// criteria / sources) beyond the plain title+description+image fields
// TemplateTool renders. Same `page` fetch either way: the `tool` select's
// own `campaigns`/`criteria`/`sources` relations (app/kql/page-selects.ts)
// are what feed each one.
const isCampaignsMap = slug === 'campaigns-map'
const isBotTrollDetector = slug === 'bot-troll-detector'
const isSourceReliability = slug === 'source-reliability-plugin'
</script>

<template>
  <TemplateCampaignsMap v-if="isCampaignsMap" :page="page" />
  <TemplateBotTrollDetector v-else-if="isBotTrollDetector" :page="page" />
  <TemplateSourceReliability v-else-if="isSourceReliability" :page="page" />
  <TemplateTool v-else :page="page" />
</template>
