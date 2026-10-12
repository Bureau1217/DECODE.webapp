<script setup lang="ts">
const route = useRoute()
const slug = assertSafeKirbyId(String(route.params.tool))
const page = await useKirbyPage(`page:tools/${slug}`, `page('tools/${slug}')`, 'tool')

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
