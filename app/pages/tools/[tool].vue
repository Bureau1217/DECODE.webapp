<script setup lang="ts">
const route = useRoute()
const slug = assertSafeKirbyId(String(route.params.tool))
const page = await useKirbyPage(`page:tools/${slug}`, `page('tools/${slug}')`, 'tool')

// "Campaigns Maps" and "Bot / Troll Detector" each get their own custom
// view instead of the generic TemplateTool — only those two tools have
// underlying data (campaigns / criteria) to show beyond the plain
// title+description+image fields TemplateTool renders. Same `page` fetch
// either way: the `tool` select's own `campaigns`/`criteria` relations
// (app/kql/page-selects.ts) are what feed each one.
const isCampaignsMap = slug === 'campaigns-map'
const isBotTrollDetector = slug === 'bot-troll-detector'
</script>

<template>
  <TemplateCampaignsMap v-if="isCampaignsMap" :page="page" />
  <TemplateBotTrollDetector v-else-if="isBotTrollDetector" :page="page" />
  <TemplateTool v-else :page="page" />
</template>
