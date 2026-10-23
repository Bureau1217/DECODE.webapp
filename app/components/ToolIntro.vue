<script setup lang="ts">
// Entrance state of a custom tool page (TemplateToolPageLayout.vue's
// `intro` prop) — the left panel only: same h3-band + li-row shell as
// Campaigns Maps' own intro (CampaignInfoPanel.vue, no campaign
// selected): the tool's name, the students behind it (DECODE.cms
// fields/credits.yml), its CMS description. The Start button sits in the
// right-hand content column (the layout itself) until the tool starts.
defineProps<{
  title: string
  description?: string
  credits?: string
  // Each tool's own tokens (main.css): `band` fills the section headers,
  // `bandText` is readable on it.
  band: string
  bandText: string
}>()

const readingMode = useReadingMode()
</script>

<template>
  <InfoPanel class="tool-intro" :reading-mode="readingMode" :style="{ '--intro-band': band, '--intro-band-text': bandText }">
    <h3 class="text-label">About this tool</h3>
    <ul>
      <li class="tool-intro-title-row">{{ title }}</li>
    </ul>

    <template v-if="credits">
      <h3 class="text-label">Idea by</h3>
      <ul>
        <li>{{ credits }}</li>
      </ul>
    </template>

    <template v-if="description">
      <h3 class="text-label">Description</h3>
      <ul>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <li class="tool-intro-description-row" v-html="description" />
      </ul>
    </template>
  </InfoPanel>
</template>

<style scoped>
/* Same metrics as CampaignInfoPanel.vue's own h3/li — recolored per tool
   via --intro-band/--intro-band-text instead of that panel's fixed coral. */
.tool-intro h3 {
  box-sizing: border-box;
  margin: 0;
  height: 30px;
  width: 100%;
  padding-left: 10px;
  background: var(--intro-band);
  color: var(--intro-band-text);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
}

.tool-intro ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tool-intro li {
  box-sizing: border-box;
  min-height: 26px;
  width: 100%;
  padding: 4px 10px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  color: var(--color-ink);
}

.tool-intro li.tool-intro-title-row {
  padding: 16px 10px;
}

.tool-intro li.tool-intro-description-row {
  align-items: flex-start;
  line-height: 1.5;
}

.tool-intro li.tool-intro-description-row :deep(p) {
  margin: 0;
}
</style>
