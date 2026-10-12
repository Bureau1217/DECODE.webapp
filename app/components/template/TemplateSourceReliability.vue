<script setup lang="ts">
// Custom detail view for the "Source Reliability Plugin" tool (wired in
// app/pages/tools/[tool].vue by slug, not used by any other tool) — left
// panel is the source database editors manage in the CMS (the `tool`
// select's own `sources` relation, app/kql/page-selects.ts), right panel
// is static install instructions + an illustrative extension preview
// (SourcePluginInfoPanel.vue). Same fixed-left/offset-right layout
// formula as the other two custom tool templates, purple (CDB4EA)
// instead of their coral/teal.
import type { Source } from '~/types/source'

const props = defineProps<{
  page: {
    url?: string
    sources: Source[]
  }
}>()

const readingMode = useReadingMode()
</script>

<template>
  <TemplateToolPageLayout :reading-mode="readingMode">
    <template #panel>
      <SourceDatabasePanel :sources="props.page.sources" />
    </template>
    <template #content>
      <SourcePluginInfoPanel :url="props.page.url" />
    </template>
  </TemplateToolPageLayout>
</template>
