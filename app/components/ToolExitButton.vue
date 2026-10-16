<script setup lang="ts">
// Back to the tools list — the cross Campaigns Maps had in its own top-
// right corner (DisinfoMap.vue), now shared by every custom tool page via
// TemplateToolPageLayout.vue. Icon only, no label. `accent` is the
// border/hover fill, `textColor` the cross itself at rest.
defineProps<{
  accent: string
  textColor?: string
}>()
</script>

<template>
  <ButtonOutline
    to="/tools"
    class="tool-exit"
    :accent="accent"
    :text-color="textColor"
    background="rgba(255, 255, 255, 0.92)"
    aria-label="Exit tool"
  >
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" />
      <line x1="22" y1="2" x2="2" y2="22" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" />
    </svg>
  </ButtonOutline>
</template>

<style scoped>
.tool-exit {
  width: 28px;
  height: 28px;
}
</style>
