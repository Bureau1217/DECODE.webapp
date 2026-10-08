<script setup lang="ts">
const route = useRoute()
const slug = assertSafeKirbyId(String(route.params.tool))
const page = await useKirbyPage(`page:tools/${slug}`, `page('tools/${slug}')`, 'tool')

// "Campaigns Maps" gets its own custom view (map + campaign info split
// panel, TemplateCampaignsMap.vue) instead of the generic TemplateTool —
// only that one tool has the underlying campaign/map data to show.
// page is still fetched above (cheap, and keeps this file simple) but
// TemplateCampaignsMap doesn't use it — its own data comes from
// useCampaigns() instead.
const isCampaignsMap = slug === 'campaigns-map'
</script>

<template>
  <TemplateCampaignsMap v-if="isCampaignsMap" :page="page" />
  <TemplateTool v-else :page="page" />
</template>
