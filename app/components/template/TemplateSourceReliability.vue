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
    title: string
    description?: string
    credits?: string
    url?: string
    sources: Source[]
  }
}>()

const readingMode = useReadingMode()
</script>

<template>
  <TemplateToolPageLayout
    :reading-mode="readingMode"
    :exit="{ accent: 'var(--tool-sourcerel-accent-deep)' }"
    :intro="{
      title: props.page.title,
      description: props.page.description,
      credits: props.page.credits,
      band: 'var(--tool-sourcerel-accent)',
      bandText: 'var(--color-ink)',
      start: 'var(--tool-sourcerel-chrome)',
      cover: 'var(--tool-sourcerel-cover)',
    }"
  >
    <template #panel="{ empty }">
      <SourceDatabasePanel :sources="props.page.sources" :empty="empty" />
    </template>
    <template #content>
      <SourcePluginInfoPanel :title="props.page.title" :url="props.page.url" />
    </template>
  </TemplateToolPageLayout>
</template>
